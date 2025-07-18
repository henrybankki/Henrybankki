/**
 * Henrybankki App - Shared Script
 * NOTE: firebase-config.js must initialize Firebase!
 * Firestore structure:
 * users/{userId} = { pin, isAdmin, }
 * users/{userId}/accounts/{accountId} = { type, iban, balance }
 * invoices/{invoiceId} = { ref, targetIban, amount, message, status:'unpaid'|'paid', createdBy, createdAt, paidByUserId?, paidFromIban?, paidAt? }
 * transfers/{transferId} = { fromIban, toIban, amount, message, ref?, type:'transfer'|'invoice', userFrom, userTo, ts }
 * loans/{loanId} = { userId, amount, message, status:'pending'|'approved'|'rejected', createdAt, decidedAt?, decidedBy? }
 */

// ---------- Globals ----------
const db = firebase.firestore();

// Hard-coded admin credentials (demo)
const ADMIN_USER = "011100";
const ADMIN_PIN  = "143000";

// Crypto & stock symbol maps (investments)
const cryptoMap = { BTC:'bitcoin', ETH:'ethereum', BNB:'binancecoin', SOL:'solana', XRP:'ripple' };
const stockMap  = { NOKIA:'NOKIA.HE', KONE:'KNEBV.HE', FORTUM:'FORTUM.HE', SAMPO:'SAMPO.HE', NESTE:'NESTE.HE' };

let currentUserId = null;
let currentUserIsAdmin = false;
let accountCache = []; // {id, iban, type, balance}

// Investment chart
let investmentChart = null;
let currentInvestSymbol = null;
let investAutoUpdate = null;

// ---------- Utilities ----------
function $(id){return document.getElementById(id);}

function genIban(){
  // fake FI IBAN: FI + 2 random check + 12 digits
  const num = Math.floor(100000000000 + Math.random()*900000000000);
  return 'FI' + String(num);
}

function genInvoiceRef(){
  // 6-digit numeric reference
  return String(Math.floor(100000 + Math.random()*900000));
}

function requireAuth(){
  if(!currentUserId){
    alert('Kirjaudu ensin.');
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function formatEuro(n){
  return (Number(n)||0).toFixed(2) + ' €';
}

function toDateStr(tsIso){
  try{
    const d = new Date(tsIso);
    return d.toLocaleString('fi-FI');
  }catch(e){return tsIso;}
}

// ---------- Auth ----------
async function doLogin(){
  const userId = $('userId').value.trim();
  const pin = $('pin').value.trim();
  if(!userId||!pin){alert('Täytä tunnus ja PIN.');return;}
  const snap = await db.collection('users').doc(userId).get();
  if(!snap.exists){alert('Käyttäjää ei löydy.');return;}
  const data = snap.data();
  if(data.pin !== pin){alert('Virheellinen PIN.');return;}
  currentUserId = userId;
  currentUserIsAdmin = !!data.isAdmin || (userId===ADMIN_USER && pin===ADMIN_PIN);
  localStorage.setItem('currentUserId', currentUserId);
  localStorage.setItem('currentUserIsAdmin', currentUserIsAdmin?'1':'0');
  showMainSection();
}

async function doSignup(){
  const userId = $('userId').value.trim();
  const pin = $('pin').value.trim();
  if(!userId||!pin){alert('Täytä tunnus ja PIN.');return;}
  const isAdmin = (userId===ADMIN_USER && pin===ADMIN_PIN);
  await db.collection('users').doc(userId).set({
    pin,
    isAdmin,
    createdAt: new Date().toISOString()
  });
  // create default käyttötili
  const acctRef = db.collection('users').doc(userId).collection('accounts').doc();
  await acctRef.set({
    type:'kayttotili',
    iban:genIban(),
    balance:100  // aloitus
  });
  alert('Tili luotu! Voit kirjautua.');
}

function doLogout(){
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('currentUserIsAdmin');
  currentUserId=null;currentUserIsAdmin=false;
  location.href='index.html';
}

function showMainSection(){
  const auth = $('auth-section');
  const main = $('main-section');
  if(auth) auth.style.display='none';
  if(main) main.style.display='block';
  if(main) loadDashboard();
}

// attempt auto-login from localStorage (on each page)
(function autoLoginInit(){
  currentUserId = localStorage.getItem('currentUserId');
  currentUserIsAdmin = localStorage.getItem('currentUserIsAdmin')==='1';
})();

// ---------- Dashboard (index) ----------
async function loadDashboard(){
  if(!requireAuth())return;
  const wrap = $('accounts-summary');
  const totalEl = $('accounts-total');
  const adminLinkWrapper = $('admin-link-wrapper');

  // fetch accounts
  const coll = await db.collection('users').doc(currentUserId).collection('accounts').get();
  accountCache = coll.docs.map(d=>({id:d.id,...d.data()}));
  if(wrap){
    wrap.innerHTML='';
    accountCache.forEach(ac=>{
      const div=document.createElement('div');
      div.className='acct';
      div.innerHTML=`<strong>${ac.type}</strong>IBAN: ${ac.iban}<br>Saldo: ${formatEuro(ac.balance)}`;
      wrap.appendChild(div);
    });
  }
  const total = accountCache.reduce((s,a)=>s+(Number(a.balance)||0),0);
  if(totalEl) totalEl.textContent='Yhteensä: '+formatEuro(total);

  if(adminLinkWrapper) adminLinkWrapper.style.display=currentUserIsAdmin?'inline':'none';
}

async function createAccount(){
  if(!requireAuth())return;
  const sel=$('new-account-type');
  const type=sel?sel.value:'muu';
  const acctRef=db.collection('users').doc(currentUserId).collection('accounts').doc();
  await acctRef.set({type,iban:genIban(),balance:0});
  alert('Tili luotu.');
  loadDashboard();
}

// ---------- Transfers & Invoice Pay (payments page) ----------
async function populateAccountSelectsForPayments(){
  if(!requireAuth())return;
  // ensure latest accountCache
  const coll=await db.collection('users').doc(currentUserId).collection('accounts').get();
  accountCache=coll.docs.map(d=>({id:d.id,...d.data()}));

  const sel1=$('transfer-from-account');
  const sel2=$('pay-invoice-from-account');
  if(sel1){sel1.innerHTML='';}
  if(sel2){sel2.innerHTML='';}
  accountCache.forEach(ac=>{
    const o=document.createElement('option');
    o.value=ac.iban;
    o.textContent=`${ac.type.toUpperCase()} (${formatEuro(ac.balance)})`;
    if(sel1)sel1.appendChild(o.cloneNode(true));
    if(sel2)sel2.appendChild(o);
  });
}

// get account doc by iban (returns {userId,acctId,data} or null)
async function lookupAccountByIban(iban){
  // naive scan across users: not scalable; demo only.
  // Better: maintain mapping collection {iban->userId,acctId}
  const usersSnap=await db.collection('users').get();
  for(const userDoc of usersSnap.docs){
    const acctsSnap=await db.collection('users').doc(userDoc.id).collection('accounts').where('iban','==',iban).get();
    if(!acctsSnap.empty){
      const acctDoc=acctsSnap.docs[0];
      return {userId:userDoc.id,acctId:acctDoc.id,data:acctDoc.data()};
    }
  }
  return null;
}

// update account balance atomically
async function updateAccountBalance(userId,acctId,delta){
  const ref=db.collection('users').doc(userId).collection('accounts').doc(acctId);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists)throw new Error('Tiliä ei löydy.');
    const bal=Number(snap.data().balance)||0;
    if(delta<0 && bal<Math.abs(delta))throw new Error('Ei tarpeeksi saldoa.');
    tx.update(ref,{balance:bal+delta});
  });
}

// Send money free-form
async function sendMoney(){
  if(!requireAuth())return;
  const fromIban=$('transfer-from-account').value.trim();
  const toIban=$('recipient-iban').value.trim().toUpperCase();
  const amount=Number($('transfer-amount').value);
  const msg=$('transfer-message').value.trim();

  if(!fromIban||!toIban||!(amount>0)){alert('Täytä IBAN ja summa.');return;}
  // lookup both
  const fromAc = await lookupAccountByIban(fromIban);
  const toAc   = await lookupAccountByIban(toIban);
  if(!fromAc){alert('Lähettävän tilin tietoja ei löydy.');return;}
  if(!toAc){alert('Saajan tiliä ei löydy.');return;}
  if(fromAc.userId!==currentUserId){alert('Et voi käyttää toisen tiliä.');return;}

  try{
    await db.runTransaction(async tx=>{
      const fromRef=db.collection('users').doc(fromAc.userId).collection('accounts').doc(fromAc.acctId);
      const toRef  =db.collection('users').doc(toAc.userId).collection('accounts').doc(toAc.acctId);
      const fromSnap=await tx.get(fromRef);
      const toSnap=await tx.get(toRef);
      const fromBal=Number(fromSnap.data().balance)||0;
      if(fromBal<amount)throw new Error('Ei tarpeeksi saldoa.');
      tx.update(fromRef,{balance:fromBal-amount});
      tx.update(toRef,{balance:(Number(toSnap.data().balance)||0)+amount});
    });
    await db.collection('transfers').add({
      fromIban:fromIban,
      toIban:toIban,
      amount,
      message:msg||'',
      type:'transfer',
      userFrom:currentUserId,
      userTo:toAc.userId,
      ts:new Date().toISOString()
    });
    alert('Siirto onnistui.');
    populateAccountSelectsForPayments();
  }catch(e){
    console.error(e);
    alert('Siirto epäonnistui: '+e.message);
  }
}

// Load open invoices for current user accounts
async function loadOpenInvoices(){
  if(!requireAuth())return;
  // fetch user's ibans
  const acSnap=await db.collection('users').doc(currentUserId).collection('accounts').get();
  const ibans=acSnap.docs.map(d=>d.data().iban);
  if(!ibans.length)return;
  const listEl=$('open-invoices-list');
  if(listEl)listEl.innerHTML='';

  // Firestore cannot OR easily; we'll fetch all invoices and filter (demo)
  const invSnap=await db.collection('invoices').where('status','==','unpaid').get();
  const rows=[];
  invSnap.forEach(doc=>{
    const d=doc.data();
    if(ibans.includes(d.targetIban)){
      rows.push({id:doc.id,...d});
    }
  });
  rows.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  if(listEl){
    if(!rows.length){
      listEl.innerHTML='<li>Ei avoimia laskuja</li>';
    }else{
      rows.forEach(r=>{
        const li=document.createElement('li');
        li.innerHTML=`<span>Viite {r.ref} - {r.amount}€</span><button data-payinv="${r.id}" class="pay-inv-btn">Maksa</button>`;
        listEl.appendChild(li);
      });
      // Wire inline buttons
      listEl.querySelectorAll('.pay-inv-btn').forEach(btn=>{
        btn.addEventListener('click', async e=>{
          const invId=e.target.getAttribute('data-payinv');
          const invDoc=await db.collection('invoices').doc(invId).get();
          if(!invDoc.exists)return;
          const inv=invDoc.data();
          // prefill invoice section fields
          $('invoice-iban').value=inv.targetIban;
          $('invoice-ref').value=inv.ref;
          $('invoice-amount').value=inv.amount;
          $('invoice-message').value=inv.message||'';
          window.scrollTo({top:0,behavior:'smooth'});
        });
      });
    }
  }
}

// Pay invoice
async function payInvoice(){
  if(!requireAuth())return;
  const fromIban=$('pay-invoice-from-account').value.trim();
  const targetIban=$('invoice-iban').value.trim().toUpperCase();
  const ref=$('invoice-ref').value.trim();
  const amount=Number($('invoice-amount').value);
  const msg=$('invoice-message').value.trim();

  if(!fromIban||!targetIban||!ref||!(amount>0)){alert('Täytä kaikki laskun tiedot.');return;}

  // locate invoice by ref & iban & amount & status=unpaid
  const snap=await db.collection('invoices').where('ref','==',ref).where('status','==','unpaid').get();
  if(snap.empty){alert('Laskua ei löydy tai se on jo maksettu.');return;}
  // find match
  let invDoc=null, invData=null;
  snap.forEach(d=>{
    const data=d.data();
    if(data.targetIban===targetIban && Number(data.amount)===amount){
      invDoc=d;
      invData=data;
    }
  });
  if(!invDoc){alert('Laskun tiedot eivät täsmää.');return;}

  // debit from, credit target
  const fromAc=await lookupAccountByIban(fromIban);
  const toAc=await lookupAccountByIban(targetIban);
  if(!fromAc){alert('Maksutiliä ei löydy.');return;}
  if(fromAc.userId!==currentUserId){alert('Et voi maksaa toisen tililtä.');return;}
  if(!toAc){alert('Laskun vastaanottajan tiliä ei löydy.');return;}

  try{
    await db.runTransaction(async tx=>{
      const fromRef=db.collection('users').doc(fromAc.userId).collection('accounts').doc(fromAc.acctId);
      const toRef  =db.collection('users').doc(toAc.userId).collection('accounts').doc(toAc.acctId);
      const invRef =db.collection('invoices').doc(invDoc.id);

      const fromSnap=await tx.get(fromRef);
      const toSnap  =await tx.get(toRef);
      const invSnap =await tx.get(invRef);

      if(invSnap.data().status!=='unpaid')throw new Error('Lasku jo maksettu.');
      const bal=Number(fromSnap.data().balance)||0;
      if(bal<amount)throw new Error('Ei tarpeeksi saldoa.');

      tx.update(fromRef,{balance:bal-amount});
      tx.update(toRef,{balance:(Number(toSnap.data().balance)||0)+amount});
      tx.update(invRef,{
        status:'paid',
        paidByUserId:currentUserId,
        paidFromIban:fromIban,
        paidAt:new Date().toISOString()
      });
    });
    await db.collection('transfers').add({
      fromIban:fromIban,
      toIban:targetIban,
      amount,
      message:msg||invData.message||'',
      ref,
      type:'invoice',
      userFrom:currentUserId,
      userTo:toAc.userId,
      ts:new Date().toISOString()
    });
    alert('Lasku maksettu.');
    populateAccountSelectsForPayments();
    loadOpenInvoices();
  }catch(e){
    console.error(e);
    alert('Maksu epäonnistui: '+e.message);
  }
}

// ---------- Transfer History (show both in/out) ----------
async function loadTransferHistoryInto(elementId){
  if(!requireAuth())return;
  const listEl=$(elementId);
  if(!listEl)return;
  listEl.innerHTML='';

  // get all user ibans
  const acctSnap=await db.collection('users').doc(currentUserId).collection('accounts').get();
  const ibans=acctSnap.docs.map(d=>d.data().iban);
  if(!ibans.length){
    listEl.innerHTML='<li>Ei tilejä</li>';
    return;
  }

  // naive scan: get last 100 transfers and filter
  const trSnap=await db.collection('transfers').orderBy('ts','desc').limit(100).get();
  const items=[];
  trSnap.forEach(doc=>{
    const d=doc.data();
    if(ibans.includes(d.fromIban) || ibans.includes(d.toIban)){
      items.push(d);
    }
  });

  if(!items.length){
    listEl.innerHTML='<li>Ei siirtoja</li>';
    return;
  }

  items.sort((a,b)=>b.ts.localeCompare(a.ts));
  items.forEach(tr=>{
    const li=document.createElement('li');
    const dir=ibans.includes(tr.fromIban)?'-':'+';
    li.innerHTML=`<span>{dir} {formatEuro(tr.amount)} {tr.type==='invoice'?'(lasku)':''}</span><span>{toDateStr(tr.ts)}</span>`;
    listEl.appendChild(li);
  });
}

// ---------- Admin ----------
async function adminOnlyCheck(){
  if(!requireAuth())return false;
  if(!currentUserIsAdmin){
    alert('Vain admin.');
    location.href='index.html';
    return false;
  }
  return true;
}

// Admin create invoice
async function adminCreateInvoice(){
  if(!await adminOnlyCheck())return;
  const targetIban=$('admin-invoice-target-iban').value.trim().toUpperCase();
  const amount=Number($('admin-invoice-amount').value);
  const msg=$('admin-invoice-message').value.trim();
  if(!targetIban||!(amount>0)){alert('Täytä IBAN ja summa.');return;}

  // verify target exists
  const target=await lookupAccountByIban(targetIban);
  if(!target){alert('Tilinumeroa ei löydy.');return;}

  const ref=genInvoiceRef();
  await db.collection('invoices').add({
    ref,
    targetIban,
    amount,
    message:msg||'',
    status:'unpaid',
    createdBy:currentUserId,
    createdAt:new Date().toISOString()
  });
  alert('Lasku luotu. Viite: '+ref);
  $('admin-invoice-target-iban').value='';
  $('admin-invoice-amount').value='';
  $('admin-invoice-message').value='';
}

// Admin add money by username (adds to *first* account found; you could extend UI)
async function adminAddMoney(){
  if(!await adminOnlyCheck())return;
  const u=$('add-money-user').value.trim();
  const amt=Number($('add-money-amount').value);
  if(!u||!(amt>0)){alert('Täytä käyttäjä ja summa.');return;}
  const userSnap=await db.collection('users').doc(u).get();
  if(!userSnap.exists){alert('Käyttäjää ei löydy');return;}
  const acSnap=await db.collection('users').doc(u).collection('accounts').limit(1).get();
  if(acSnap.empty){alert('Käyttäjällä ei tilejä');return;}
  const acct=acSnap.docs[0];
  await updateAccountBalance(u,acct.id,amt);
  alert('Rahaa lisätty.');
}

// Admin load and approve loans
async function adminLoadLoans(){
  if(!await adminOnlyCheck())return;
  const list=$('admin-loans-list');
  if(!list)return;
  list.innerHTML='';
  const snap=await db.collection('loans').where('status','==','pending').get();
  if(snap.empty){list.innerHTML='<li>Ei lainapyyntöjä</li>';return;}
  snap.forEach(doc=>{
    const d=doc.data();
    const li=document.createElement('li');
    li.innerHTML=`<span>{doc.id}: {formatEuro(d.amount)} {d.userId}</span>`;
    const btnA=document.createElement('button');
    btnA.textContent='Hyväksy';
    btnA.addEventListener('click',()=>adminDecideLoan(doc.id,true,d));
    const btnR=document.createElement('button');
    btnR.textContent='Hylkää';
    btnR.className='danger';
    btnR.addEventListener('click',()=>adminDecideLoan(doc.id,false,d));
    li.appendChild(btnA);li.appendChild(btnR);
    list.appendChild(li);
  });
}

async function adminDecideLoan(id,approve,data){
  if(!await adminOnlyCheck())return;
  const status=approve?'approved':'rejected';
  const ref=db.collection('loans').doc(id);
  await ref.update({
    status,
    decidedAt:new Date().toISOString(),
    decidedBy:currentUserId
  });
  if(approve){
    // credit user's first account
    const acSnap=await db.collection('users').doc(data.userId).collection('accounts').limit(1).get();
    if(!acSnap.empty){
      const acct=acSnap.docs[0];
      await updateAccountBalance(data.userId,acct.id,Number(data.amount));
    }
  }
  adminLoadLoans();
}

// ---------- Loans (user) ----------
async function requestLoan(){
  if(!requireAuth())return;
  const amt=Number($('loan-amount').value);
  const msg=$('loan-message')?$('loan-message').value.trim():'';
  if(!(amt>0)){alert('Anna summa.');return;}
  await db.collection('loans').add({
    userId:currentUserId,
    amount:amt,
    message:msg||'',
    status:'pending',
    createdAt:new Date().toISOString()
  });
  alert('Lainapyyntö lähetetty.');
  loadUserLoans();
}

async function loadUserLoans(){
  if(!requireAuth())return;
  const list=$('loan-list');
  if(!list)return;
  list.innerHTML='';
  const snap=await db.collection('loans').where('userId','==',currentUserId).orderBy('createdAt','desc').get();
  if(snap.empty){list.innerHTML='<li>Ei lainapyyntöjä</li>';return;}
  snap.forEach(doc=>{
    const d=doc.data();
    const li=document.createElement('li');
    li.innerHTML=`<span>{formatEuro(d.amount)} - {d.status}</span><span>{toDateStr(d.createdAt)}</span>`;
    list.appendChild(li);
  });
}

// ---------- Investments ----------
function loadInvestmentTargets(){
  const sel = document.getElementById('investment-target');
  if (!sel) return;

  const targets = [
    { id:'BTC', name:'Bitcoin' },
    { id:'ETH', name:'Ethereum' },
    { id:'BNB', name:'Binance Coin' },
    { id:'SOL', name:'Solana' },
    { id:'XRP', name:'Ripple' },
    { id:'NOKIA', name:'Nokia Oyj' },
    { id:'KONE', name:'KONE Oyj' },
    { id:'FORTUM', name:'Fortum Oyj' },
    { id:'SAMPO', name:'Sampo Oyj' },
    { id:'NESTE', name:'Neste Oyj' }
  ];

  // Estä loputon kasautuminen
  sel.innerHTML = '';

  targets.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  });

  // Käynnistä päivitys ensimmäiselle kohteelle
  startInvestAutoUpdate(targets[0].id);
}



function onInvestmentTargetChange(){
  const sel=$('investment-target');
  if(!sel)return;
  startInvestAutoUpdate(sel.value);
}

function startInvestAutoUpdate(symbol){
  currentInvestSymbol=symbol;
  if(investAutoUpdate)clearInterval(investAutoUpdate);
  loadInvestmentGraph(symbol);
  investAutoUpdate=setInterval(()=>loadInvestmentGraph(symbol),10000);
}

async function loadInvestmentGraph(symbol){
  const ctx=$('investmentChart');
  if(!ctx)return;
  let labels=[],prices=[];
  try{
    if(cryptoMap[symbol]){
      const id=cryptoMap[symbol];
      const url=`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=eur&days=30`;
      const res=await fetch(url);const data=await res.json();
      labels=data.prices.map(p=>new Date(p[0]).toLocaleDateString('fi-FI',{day:'2-digit',month:'short'}));
      prices=data.prices.map(p=>p[1]);
    }else if(stockMap[symbol]){
      const ticker=stockMap[symbol];
      const url=`https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1mo&interval=1d`;
      const res=await fetch(url);const json=await res.json();
      const r=json.chart.result[0];
      labels=r.timestamp.map(ts=>new Date(ts*1000).toLocaleDateString('fi-FI',{day:'2-digit',month:'short'}));
      prices=r.indicators.quote[0].close;
    }else{
      labels=['1','2','3'];prices=[1,1,1];
    }
    if(investmentChart)investmentChart.destroy();
    investmentChart=new Chart(ctx,{
      type:'line',
      data:{labels,datasets:[{label:symbol,data:prices,borderColor:'blue',backgroundColor:'rgba(0,0,255,0.1)',fill:true}]},
      options:{responsive:true,maintainAspectRatio:false}
    });
  }catch(e){console.error(e);}
}

// Demo invest bookkeeping (no asset price tracking vs amount)
async function invest(){
  if(!requireAuth())return;
  const amt=Number($('investment-amount').value);
  if(!(amt>0)){alert('Anna summa.');return;}
  // withdraw from first account
  const acSnap=await db.collection('users').doc(currentUserId).collection('accounts').limit(1).get();
  if(acSnap.empty){alert('Ei tilejä.');return;}
  const acct=acSnap.docs[0];
  const fromBal=acct.data().balance;
  if(fromBal<amt){alert('Ei tarpeeksi saldoa.');return;}
  await updateAccountBalance(currentUserId,acct.id,-amt);
  // store user investment (aggregate)
  const invRef=db.collection('users').doc(currentUserId).collection('investments').doc(currentInvestSymbol);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(invRef);
    const cur=snap.exists?(Number(snap.data().amount)||0):0;
    tx.set(invRef,{amount:cur+amt},{merge:true});
  });
  alert('Sijoitettu '+formatEuro(amt)+' '+currentInvestSymbol);
}

async function redeemInvestment(){
  if(!requireAuth())return;
  const invRef=db.collection('users').doc(currentUserId).collection('investments').doc(currentInvestSymbol);
  const snap=await invRef.get();
  if(!snap.exists||!(Number(snap.data().amount)>0)){alert('Ei sijoitusta.');return;}
  const amt=Number(snap.data().amount);
  // credit first account
  const acSnap=await db.collection('users').doc(currentUserId).collection('accounts').limit(1).get();
  if(acSnap.empty){alert('Ei tilejä.');return;}
  const acct=acSnap.docs[0];
  await updateAccountBalance(currentUserId,acct.id,amt);
  await invRef.delete();
  alert('Lunastettu '+formatEuro(amt)+' '+currentInvestSymbol);
}

// ---------- Page bootstrap ----------
document.addEventListener('DOMContentLoaded',()=>{
  const page=document.documentElement.getAttribute('data-page');
  if(page==='index'){
    $('login-btn').addEventListener('click',doLogin);
    $('signup-btn').addEventListener('click',doSignup);
    $('logout-btn').addEventListener('click',doLogout);
    const createBtn=$('create-account-btn');
    if(createBtn)createBtn.addEventListener('click',createAccount);
    // if already logged
    if(currentUserId)showMainSection();
  }
  else if(page==='payments'){
    if(!requireAuth())return;
    $('send-money-btn').addEventListener('click',sendMoney);
    $('pay-invoice-btn').addEventListener('click',payInvoice);
    populateAccountSelectsForPayments();
    loadOpenInvoices();
    loadTransferHistoryInto('transfer-list');
  }
  else if(page==='investments'){
    if(!requireAuth())return;
    $('invest-btn').addEventListener('click',invest);
    $('redeem-btn').addEventListener('click',redeemInvestment);
    loadInvestmentTargets();
  }
  else if(page==='loans'){
    if(!requireAuth())return;
    $('request-loan-btn').addEventListener('click',requestLoan);
    loadUserLoans();
  }
  else if(page==='admin'){
    if(!requireAuth())return;
    if(!currentUserIsAdmin){alert('Vain admin.');location.href='index.html';return;}
    $('admin-create-invoice-btn').addEventListener('click',adminCreateInvoice);
    $('add-money-btn').addEventListener('click',adminAddMoney);
    adminLoadLoans();
  }
});

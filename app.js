/**
 * Henrybankki - Multi-page App
 * Requires firebase-config.js in project root (relative ../ for subpages)
 */

const db = firebase.firestore();

const ADMIN_USER = "011100";
const ADMIN_PIN  = "143000";

const cryptoMap = { BTC:'bitcoin', ETH:'ethereum', BNB:'binancecoin', SOL:'solana', XRP:'ripple' };
const stockMap  = { NOKIA:'NOKIA.HE', KONE:'KNEBV.HE', FORTUM:'FORTUM.HE', SAMPO:'SAMPO.HE', NESTE:'NESTE.HE' };

let currentUserId = localStorage.getItem('currentUserId') || null;
let currentUserIsAdmin = localStorage.getItem('currentUserIsAdmin') === '1';
let accountCache = [];
let investmentChart = null;
let currentInvestSymbol = null;
let investAutoUpdate = null;

function $(id){return document.getElementById(id);}

function genIban(){
  const num = Math.floor(100000000000 + Math.random()*900000000000);
  return 'FI' + num;
}
function genInvoiceRef(){ return String(Math.floor(100000 + Math.random()*900000)); }
function formatEuro(n){ return (Number(n)||0).toFixed(2)+' €'; }
function toDateStr(t){ try{return new Date(t).toLocaleString('fi-FI');}catch(e){return t;} }

function requireAuth(){
  if(!currentUserId){
    alert('Kirjaudu ensin.');
    // We are in subpage -> redirect root
    window.location.href = '../index.html';
    return false;
  }
  return true;
}

/* ---------------- AUTH (index) ---------------- */
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
  // go to dashboard
  window.location.href = 'html/dashboard.html';
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
  alert('Tili luotu! Voit kirjautua.');
}

/* ------------- Dashboard ------------- */
async function loadDashboard(){
  if(!requireAuth())return;
  const wrap = $('accounts-summary');
  const totalEl = $('accounts-total');
  const adminLinkWrapper = $('admin-link-wrapper');

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

  loadTransferHistoryInto('transfer-list'); // on dashboard
}

async function requestAccount(){
  if(!requireAuth())return;
  const type=$('new-account-type').value;
  await db.collection('accountRequests').add({
    userId:currentUserId,
    type,
    status:'pending',
    createdAt:new Date().toISOString()
  });
  alert('Tilipyyntö lähetetty adminille.');
}

function doLogout(){
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('currentUserIsAdmin');
  currentUserId=null;
  currentUserIsAdmin=false;
  window.location.href='../index.html';
}

/* ------------- Payments helpers ------------- */
async function populateAccountSelectsForPayments(){
  if(!requireAuth())return;
  const coll=await db.collection('users').doc(currentUserId).collection('accounts').get();
  accountCache=coll.docs.map(d=>({id:d.id,...d.data()}));
  const sel1=$('transfer-from-account');
  const sel2=$('pay-invoice-from-account');
  if(sel1)sel1.innerHTML='';
  if(sel2)sel2.innerHTML='';
  accountCache.forEach(ac=>{
    const o=document.createElement('option');
    o.value=ac.iban;
    o.textContent=`${ac.type.toUpperCase()} (${formatEuro(ac.balance)})`;
    if(sel1)sel1.appendChild(o.cloneNode(true));
    if(sel2)sel2.appendChild(o);
  });
}

async function lookupAccountByIban(iban){
  const usersSnap=await db.collection('users').get();
  for(const userDoc of usersSnap.docs){
    const acSnap=await db.collection('users').doc(userDoc.id).collection('accounts').where('iban','==',iban).get();
    if(!acSnap.empty){
      const acctDoc=acSnap.docs[0];
      return {userId:userDoc.id,acctId:acctDoc.id,data:acctDoc.data()};
    }
  }
  return null;
}

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

async function sendMoney(){
  if(!requireAuth())return;
  const fromIban=$('transfer-from-account').value.trim();
  const toIban=$('recipient-iban').value.trim().toUpperCase();
  const amount=Number($('transfer-amount').value);
  const msg=$('transfer-message').value.trim();
  if(!fromIban||!toIban||!(amount>0)){alert('Täytä IBAN ja summa.');return;}
  const fromAc=await lookupAccountByIban(fromIban);
  const toAc=await lookupAccountByIban(toIban);
  if(!fromAc){alert('Lähettävän tilin tietoja ei löydy.');return;}
  if(!toAc){alert('Saajan tiliä ei löydy.');return;}
  if(fromAc.userId!==currentUserId){alert('Et voi käyttää toisen tiliä.');return;}
  try{
    await db.runTransaction(async tx=>{
      const fromRef=db.collection('users').doc(fromAc.userId).collection('accounts').doc(fromAc.acctId);
      const toRef  =db.collection('users').doc(toAc.userId).collection('accounts').doc(toAc.acctId);
      const fromSnap=await tx.get(fromRef);
      const toSnap  =await tx.get(toRef);
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

/* ---- Load invoices (open/paid) ---- */
async function loadInvoicesForPayments(){
  if(!requireAuth())return;
  const acSnap=await db.collection('users').doc(currentUserId).collection('accounts').get();
  const ibans=acSnap.docs.map(d=>d.data().iban);
  const openEl=$('open-invoices-list');
  const paidEl=$('paid-invoices-list');
  if(openEl)openEl.innerHTML='';
  if(paidEl)paidEl.innerHTML='';

  const invSnap=await db.collection('invoices').get();
  const openRows=[],paidRows=[];
  invSnap.forEach(doc=>{
    const d=doc.data();
    if(ibans.includes(d.targetIban)){
      if(d.status==='unpaid')openRows.push({id:doc.id,...d});
      else if(d.status==='paid')paidRows.push({id:doc.id,...d});
    }
  });

  if(openEl){
    if(!openRows.length)openEl.innerHTML='<li>Ei avoimia laskuja</li>';
    else openRows.forEach(r=>{
      const li=document.createElement('li');
      li.innerHTML=`<span>Viite ${r.ref} – ${formatEuro(r.amount)}</span><button data-payinv="${r.id}" class="pay-inv-btn">Maksa</button>`;
      openEl.appendChild(li);
    });
    openEl.querySelectorAll('.pay-inv-btn').forEach(btn=>{
      btn.addEventListener('click',async e=>{
        const invId=e.target.getAttribute('data-payinv');
        const invDoc=await db.collection('invoices').doc(invId).get();
        if(!invDoc.exists)return;
        const inv=invDoc.data();
        $('invoice-iban').value=inv.targetIban;
        $('invoice-ref').value=inv.ref;
        $('invoice-amount').value=inv.amount;
        $('invoice-message').value=inv.message||'';
        window.scrollTo({top:0,behavior:'smooth'});
      });
    });
  }
  if(paidEl){
    if(!paidRows.length)paidEl.innerHTML='<li>Ei maksettuja laskuja</li>';
    else paidRows.forEach(r=>{
      const li=document.createElement('li');
      li.innerHTML=`<span>Viite ${r.ref} – ${formatEuro(r.amount)}</span><span>Maksettu</span>`;
      paidEl.appendChild(li);
    });
  }
}

/* ---- Pay invoice ---- */
async function payInvoice(){
  if(!requireAuth())return;
  const fromIban=$('pay-invoice-from-account').value.trim();
  const targetIban=$('invoice-iban').value.trim().toUpperCase();
  const ref=$('invoice-ref').value.trim();
  const amount=Number($('invoice-amount').value);
  const msg=$('invoice-message').value.trim();
  if(!fromIban||!targetIban||!ref||!(amount>0)){alert('Täytä kaikki laskun tiedot.');return;}

  const snap=await db.collection('invoices').where('ref','==',ref).get();
  let invDoc=null,invData=null;
  snap.forEach(d=>{
    const data=d.data();
    if(data.targetIban===targetIban && Number(data.amount)===amount && data.status==='unpaid'){
      invDoc=d;invData=data;
    }
  });
  if(!invDoc){alert('Laskua ei löydy tai se on jo maksettu.');return;}

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
    loadInvoicesForPayments();
  }catch(e){
    console.error(e);
    alert('Maksu epäonnistui: '+e.message);
  }
}

/* ------------- Transfer history ------------- */
async function loadTransferHistoryInto(elementId){
  if(!requireAuth())return;
  const listEl=$(elementId);
  if(!listEl)return;
  listEl.innerHTML='';

  const acSnap=await db.collection('users').doc(currentUserId).collection('accounts').get();
  const ibans=acSnap.docs.map(d=>d.data().iban);
  if(!ibans.length){
    listEl.innerHTML='<li>Ei tilejä</li>';
    return;
  }
  const trSnap=await db.collection('transfers').orderBy('ts','desc').limit(100).get();
  const items=[];
  trSnap.forEach(doc=>{
    const d=doc.data();
    if(ibans.includes(d.fromIban) || ibans.includes(d.toIban)) items.push(d);
  });
  if(!items.length){
    listEl.innerHTML='<li>Ei siirtoja</li>';
    return;
  }
  items.sort((a,b)=>b.ts.localeCompare(a.ts));
  items.forEach(tr=>{
    const li=document.createElement('li');
    const outgoing=ibans.includes(tr.fromIban);
    const dir=outgoing?'-':'+';
    li.innerHTML=`<span>${dir} ${formatEuro(tr.amount)} ${tr.type==='invoice'?'(lasku)':''}</span><span>${toDateStr(tr.ts)}</span>`;
    listEl.appendChild(li);
  });
}

/* ------------- Admin ------------- */
async function adminOnlyCheck(){
  if(!currentUserId){
    alert('Kirjaudu adminina.');
    window.location.href='../index.html';
    return false;
  }
  if(!currentUserIsAdmin){
    alert('Vain admin.');
    window.location.href='dashboard.html';
    return false;
  }
  return true;
}

async function adminLoadAccountRequests(){
  if(!await adminOnlyCheck())return;
  const list=$('admin-account-requests');
  if(!list)return;
  list.innerHTML='';
  const snap=await db.collection('accountRequests').where('status','==','pending').get();
  if(snap.empty){list.innerHTML='<li>Ei tilipyyntöjä</li>';return;}
  snap.forEach(doc=>{
    const d=doc.data();
    const li=document.createElement('li');
    li.innerHTML=`<span>${d.userId} – ${d.type}</span>`;
    const btnA=document.createElement('button');
    btnA.textContent='Hyväksy';
    btnA.addEventListener('click',()=>adminDecideAccountRequest(doc.id,true,d));
    const btnR=document.createElement('button');
    btnR.textContent='Hylkää';
    btnR.className='danger';
    btnR.addEventListener('click',()=>adminDecideAccountRequest(doc.id,false,d));
    li.appendChild(btnA);li.appendChild(btnR);
    list.appendChild(li);
  });
}

async function adminDecideAccountRequest(reqId,approve,data){
  if(!await adminOnlyCheck())return;
  const ref=db.collection('accountRequests').doc(reqId);
  if(approve){
    const acctRef=db.collection('users').doc(data.userId).collection('accounts').doc();
    await acctRef.set({
      type:data.type,
      iban:genIban(),
      balance:0
    });
  }
  await ref.update({
    status:approve?'approved':'rejected',
    decidedAt:new Date().toISOString(),
    decidedBy:currentUserId
  });
  adminLoadAccountRequests();
}

async function adminCreateInvoice(){
  if(!await adminOnlyCheck())return;
  const targetIban=$('admin-invoice-target-iban').value.trim().toUpperCase();
  const amount=Number($('admin-invoice-amount').value);
  const msg=$('admin-invoice-message').value.trim();
  if(!targetIban||!(amount>0)){alert('Täytä IBAN ja summa.');return;}
  const target=await lookupAccountByIban(targetIban);
  if(!target){alert('Tilinumeroa ei löydy.');return;}
  const refCode=genInvoiceRef();
  await db.collection('invoices').add({
    ref:refCode,
    targetIban,
    amount,
    message:msg||'',
    status:'unpaid',
    createdBy:currentUserId,
    createdAt:new Date().toISOString()
  });
  alert('Lasku luotu. Viite: '+refCode);
  $('admin-invoice-target-iban').value='';
  $('admin-invoice-amount').value='';
  $('admin-invoice-message').value='';
}

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
    li.innerHTML=`<span>${doc.id}: ${formatEuro(d.amount)} {${d.userId}}</span>`;
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
    const acSnap=await db.collection('users').doc(data.userId).collection('accounts').limit(1).get();
    if(!acSnap.empty){
      const acct=acSnap.docs[0];
      await updateAccountBalance(data.userId,acct.id,Number(data.amount));
    }
  }
  adminLoadLoans();
}

/* ------------- Loans (user) ------------- */
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
    li.innerHTML=`<span>${formatEuro(d.amount)} - ${d.status}</span><span>${toDateStr(d.createdAt)}</span>`;
    list.appendChild(li);
  });
}

/* ------------- Investments ------------- */
function loadInvestmentTargets(){
  const sel=$('investment-target');
  if(!sel)return;
  const targets=[
    {id:'BTC',name:'Bitcoin'},
    {id:'ETH',name:'Ethereum'},
    {id:'BNB',name:'Binance Coin'},
    {id:'SOL',name:'Solana'},
    {id:'XRP',name:'Ripple'},
    {id:'NOKIA',name:'Nokia Oyj'},
    {id:'KONE',name:'KONE Oyj'},
    {id:'FORTUM',name:'Fortum Oyj'},
    {id:'SAMPO',name:'Sampo Oyj'},
    {id:'NESTE',name:'Neste Oyj'},
  ];
  sel.innerHTML='';
  targets.forEach(t=>{
    const o=document.createElement('option');
    o.value=t.id; o.textContent=t.name;
    sel.appendChild(o);
  });
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
      const res=await fetch(url);
      const data=await res.json();
      labels=data.prices.map(p=>new Date(p[0]).toLocaleDateString('fi-FI',{day:'2-digit',month:'short'}));
      prices=data.prices.map(p=>p[1]);
    }else if(stockMap[symbol]){
      const ticker=stockMap[symbol];
      const url=`https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1mo&interval=1d`;
      const res=await fetch(url);
      const json=await res.json();
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
async function invest(){
  if(!requireAuth())return;
  const amt=Number($('investment-amount').value);
  if(!(amt>0)){alert('Anna summa.');return;}
  const acSnap=await db.collection('users').doc(currentUserId).collection('accounts').limit(1).get();
  if(acSnap.empty){alert('Ei tilejä.');return;}
  const acct=acSnap.docs[0];
  const fromBal=acct.data().balance;
  if(fromBal<amt){alert('Ei tarpeeksi saldoa.');return;}
  await updateAccountBalance(currentUserId,acct.id,-amt);
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
  const acSnap=await db.collection('users').doc(currentUserId).collection('accounts').limit(1).get();
  if(acSnap.empty){alert('Ei tilejä.');return;}
  const acct=acSnap.docs[0];
  await updateAccountBalance(currentUserId,acct.id,amt);
  await invRef.delete();
  alert('Lunastettu '+formatEuro(amt)+' '+currentInvestSymbol);
}

/* ------------- Page bootstrap ------------- */
document.addEventListener('DOMContentLoaded',()=>{
  const page=document.documentElement.getAttribute('data-page');
  if(page==='index'){
    $('login-btn').addEventListener('click',doLogin);
    $('signup-btn').addEventListener('click',doSignup);
  }
  else if(page==='dashboard'){
    if(!requireAuth())return;
    $('logout-btn').addEventListener('click',doLogout);
    $('request-account-btn').addEventListener('click',requestAccount);
    loadDashboard();
  }
  else if(page==='payments'){
    if(!requireAuth())return;
    $('send-money-btn').addEventListener('click',sendMoney);
    $('pay-invoice-btn').addEventListener('click',payInvoice);
    populateAccountSelectsForPayments();
    loadInvoicesForPayments();
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
    if(!adminOnlyCheck())return;
    $('admin-create-invoice-btn').addEventListener('click',adminCreateInvoice);
    $('add-money-btn').addEventListener('click',adminAddMoney);
    adminLoadLoans();
    adminLoadAccountRequests();
  }
});

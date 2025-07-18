<script>
/*
  Shared Henrybankki app script.
  Detects current page via document.documentElement.dataset.page.
  Requires firebase-config.js to have initialized Firebase.
*/

// --- Firestore handle ---
const db = firebase.firestore();

// --- Constants ---
const ADMIN_USER = "011100"; // from you
const ADMIN_PIN = "143000"; // from you

// --- State ---
let investmentChart = null;
let currentSymbol = null;
let autoUpdateInterval = null;
let cachedAccounts = []; // {acctId, name, iban, balance}

// ============================
// Utility helpers
// ============================

function goPage(path){ window.location.href = path; }

function genIban(){
  // demo IBAN: FI + 2 random check digits + 14 random digits
  const rand = () => Math.floor(Math.random()*10);
  let body = Array.from({length:14},rand).join("");
  let chk = ("0"+Math.floor(Math.random()*100)).slice(-2);
  return `FI${chk}${body}`;
}

function genInvoiceRef(){
  // Finnish viite = simple numeric; for demo  RF not used.
  // 6-18 digits; compute mod10 check? We'll just random for demo.
  return String(Math.floor(100000 + Math.random()*900000));
}

function requireLogin(){
  const uid = localStorage.getItem("currentUserId");
  if(!uid){ goPage('index.html'); return null; }
  return uid;
}

function isCurrentAdmin(){
  const uid = localStorage.getItem("currentUserId");
  const pin = localStorage.getItem("_lastPinEntered"); // stored at login
  const adminFlag = localStorage.getItem("currentUserIsAdmin") === "1";
  return adminFlag || (uid===ADMIN_USER && pin===ADMIN_PIN);
}

// ============================
// Auth
// ============================
async function login(){
  const userId = document.getElementById("userId").value.trim();
  const pin = document.getElementById("pin").value.trim();
  if(!userId||!pin){alert("Täytä tunnus ja PIN.");return;}
  const doc = await db.collection('users').doc(userId).get();
  if(!doc.exists){alert("Käyttäjää ei löytynyt.");return;}
  const data = doc.data();
  if(data.pin!==pin){alert("Virheellinen PIN.");return;}

  localStorage.setItem("currentUserId",userId);
  localStorage.setItem("_lastPinEntered",pin);
  localStorage.setItem("currentUserIsAdmin", data.isAdmin?"1":"0");

  // show dashboard elements if on index page
  if(document.documentElement.dataset.page==='dashboard'){
    document.getElementById('auth-section').style.display='none';
    document.getElementById('main-section').style.display='block';
    document.getElementById('welcome-text').innerText=`Tervetuloa ${userId}`;
    if(isCurrentAdmin()) document.getElementById('admin-nav').style.display='block';
    await loadAccountsSummary();
  } else {
    goPage('index.html');
  }
}

async function signup(){
  const userId = document.getElementById("userId").value.trim();
  const pin = document.getElementById("pin").value.trim();
  if(!userId||!pin){alert("Täytä tunnus ja PIN.");return;}
  const isAdmin = (userId===ADMIN_USER && pin===ADMIN_PIN);

  // create primary account (Käyttötili)
  const acctId = 'main';
  const iban = genIban();
  await db.collection('users').doc(userId).set({
    pin,
    isAdmin,
    defaultAccount:acctId,
    accounts:{[acctId]:{iban,name:'Käyttötili',balance:100}}
  });
  // subcollection doc
  await db.collection('users').doc(userId).collection('accounts').doc(acctId).set({
    iban,name:'Käyttötili',balance:100
  });
  alert("Tili luotu!");
}

function logout(){
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('currentUserIsAdmin');
  localStorage.removeItem('_lastPinEntered');
  if(document.documentElement.dataset.page==='dashboard'){
    document.getElementById('main-section').style.display='none';
    document.getElementById('auth-section').style.display='block';
  } else {
    goPage('index.html');
  }
}

// ============================
// Accounts (dashboard + payments)
// ============================
async function loadAccountsSummary(){
  const uid = requireLogin(); if(!uid) return;
  const accountsDiv = document.getElementById('accounts-summary');
  const totalEl = document.getElementById('total-balance');
  accountsDiv.innerHTML='';
  let total=0;
  cachedAccounts = await fetchAccounts(uid);
  cachedAccounts.forEach(ac=>{ total+=ac.balance; });
  cachedAccounts.forEach(ac=>{
    const row=document.createElement('div');
    row.className='account-row';
    row.innerHTML=`<strong>${ac.name}</strong><br>IBAN: ${ac.iban}<br>Saldo: ${ac.balance.toFixed(2)} €`;
    accountsDiv.appendChild(row);
  });
  totalEl.innerText=`Yhteensä: ${total.toFixed(2)} €`;
}

async function fetchAccounts(uid){
  const snap = await db.collection('users').doc(uid).collection('accounts').get();
  const list=[]; snap.forEach(d=>{const x=d.data();list.push({acctId:d.id,name:x.name,iban:x.iban,balance:x.balance||0});});
  return list;
}

async function populateAccountSelects(){
  const uid=requireLogin(); if(!uid) return;
  if(!cachedAccounts.length) cachedAccounts=await fetchAccounts(uid);
  const sels=[document.getElementById('pay-from-account'),document.getElementById('invoice-pay-from-account')];
  sels.forEach(sel=>{ if(!sel) return; sel.innerHTML=''; cachedAccounts.forEach(ac=>{ const opt=document.createElement('option');opt.value=ac.acctId;opt.textContent=`${ac.name} (${ac.balance.toFixed(2)} €)`;sel.appendChild(opt);});});
}

async function createSubAccount(){
  const uid=requireLogin(); if(!uid) return;
  const name = document.getElementById('new-account-name').value.trim()||'Uusi tili';
  const acctId = db.collection('_tmp').doc().id; // random
  const iban=genIban();
  await db.collection('users').doc(uid).collection('accounts').doc(acctId).set({name,iban,balance:0});
  // update summary map (optional)
  await db.collection('users').doc(uid).set({[`accounts.${acctId}`]:{name,iban,balance:0}},{merge:true});
  alert('Tili luotu.');
  cachedAccounts=[]; // force reload
  await populateAccountSelects();
  if(document.documentElement.dataset.page==='dashboard') loadAccountsSummary();
}

function getAccountById(acctId){return cachedAccounts.find(a=>a.acctId===acctId);}  

// ============================
// Transfers (free send)
// ============================
async function sendMoney(){
  const uid=requireLogin(); if(!uid) return;
  const sel=document.getElementById('pay-from-account');
  const acctId=sel?sel.value:null;
  const fromAc=getAccountById(acctId)||cachedAccounts[0];
  const toIban=document.getElementById('send-iban').value.trim().toUpperCase();
  const amt=parseFloat(document.getElementById('send-amount').value);
  const msg=document.getElementById('send-message').value.trim()||null;
  if(!fromAc||!toIban||isNaN(amt)||amt<=0){alert('Täytä tiedot.');return;}
  await transferFunds({fromUser:uid,fromIban:fromAc.iban,toIban:toIban,amount:amt,message:msg,invoiceRef:null});
  alert('Siirto tehty.');
  document.getElementById('send-amount').value='';
  document.getElementById('send-iban').value='';
  document.getElementById('send-message').value='';
  cachedAccounts=[]; // refresh
  await populateAccountSelects();
  loadTransferHistory();
}

// ============================
// Invoice payment by ref
// ============================
async function payInvoice(){
  const uid=requireLogin(); if(!uid) return;
  const sel=document.getElementById('invoice-pay-from-account');
  const acctId=sel?sel.value:null;
  const fromAc=getAccountById(acctId)||cachedAccounts[0];
  const ref=document.getElementById('pay-invoice-ref').value.trim();
  if(!ref){alert('Anna viitenumero.');return;}
  // load invoice by ref
  const invQ=await db.collection('invoices').where('ref','==',ref).limit(1).get();
  if(invQ.empty){alert('Laskua ei löytynyt.');return;}
  const invDoc=invQ.docs[0];
  const inv=invDoc.data();
  if(inv.status==='paid'){alert('Lasku on jo maksettu.');return;}
  const amt=inv.amount;
  // pay to invoice toIban
  await transferFunds({fromUser:uid,fromIban:fromAc.iban,toIban:inv.toIban,amount:amt,message:inv.message||`Lasku ${ref}`,invoiceRef:ref});
  // mark invoice paid
  await invDoc.ref.update({status:'paid',paidAt:new Date(),paidFromIban:fromAc.iban});
  alert('Lasku maksettu.');
  document.getElementById('pay-invoice-ref').value='';
  loadTransferHistory();
}

// Core transfer
async function transferFunds({fromUser,fromIban,toIban,amount,message,invoiceRef}){
  // find sender account doc
  const fromAcctDoc = await findAccountByIban(fromIban);
  if(!fromAcctDoc) throw new Error('Lähettäjän tiliä ei löytynyt.');
  const fromUserId = fromAcctDoc.userId;
  const fromAccountRef = db.collection('users').doc(fromUserId).collection('accounts').doc(fromAcctDoc.acctId);

  // find receiver account doc (optional; maybe external IBAN)
  const toAcctDoc = await findAccountByIban(toIban);
  let toAccountRef=null;
  if(toAcctDoc){
    toAccountRef = db.collection('users').doc(toAcctDoc.userId).collection('accounts').doc(toAcctDoc.acctId);
  }

  await db.runTransaction(async(tx)=>{
    const fromSnap=await tx.get(fromAccountRef);
    if(!fromSnap.exists) throw new Error('Lähettäjän tili puuttuu');
    const fromBal=fromSnap.data().balance||0;
    if(fromBal<amount) throw new Error('Ei tarpeeksi saldoa');
    tx.update(fromAccountRef,{balance:fromBal-amount});
    if(toAccountRef){
      const toSnap=await tx.get(toAccountRef);
      const toBal=toSnap.data().balance||0;
      tx.update(toAccountRef,{balance:toBal+amount});
    }
    // record transfer
    const trRef=db.collection('transfers').doc();
    tx.set(trRef,{
      fromIban,toIban,amount,message:message||null,invoiceRef:invoiceRef||null,
      createdAt:new Date(),fromUser:fromUserId,toUser:toAcctDoc?toAcctDoc.userId:null
    });
  });
}

// Find account by IBAN across all users (inefficient scan; for demo use index)
async function findAccountByIban(iban){
  // attempt quick search via top-level user map
  const userSnap=await db.collection('users').where(`accounts.main.iban`,'==',iban).get();
  if(!userSnap.empty){ // main account matched
    const u=userSnap.docs[0];
    return {userId:u.id,acctId:'main'};
  }
  // fallback scan subcollections (expensive; demo only):
  const userDocs=await db.collection('users').get();
  for(const u of userDocs.docs){
    const accSnap=await db.collection('users').doc(u.id).collection('accounts').where('iban','==',iban).get();
    if(!accSnap.empty){
      return {userId:u.id,acctId:accSnap.docs[0].id};
    }
  }
  return null;
}

// ============================
// Transfer history (both sent & received)
// ============================
async function loadTransferHistory(){
  const uid=requireLogin(); if(!uid) return;
  // collect IBANs of user's accounts
  if(!cachedAccounts.length) cachedAccounts=await fetchAccounts(uid);
  const ibans=cachedAccounts.map(a=>a.iban);
  const listEl=document.getElementById('transfer-list'); if(!listEl) return;
  listEl.innerHTML='Ladataan...';
  // fetch transfers where fromIban in ibans OR toIban in ibans
  // Firestore cannot OR easily; do two queries and merge client-side
  const sentSnaps=await Promise.all(ibans.map(i=>db.collection('transfers').where('fromIban','==',i).get()));
  const recvSnaps=await Promise.all(ibans.map(i=>db.collection('transfers').where('toIban','==',i).get()));
  const rows=[];
  sentSnaps.forEach(s=>s.forEach(doc=>rows.push({id:doc.id,...doc.data(),dir:'out'})));
  recvSnaps.forEach(s=>s.forEach(doc=>rows.push({id:doc.id,...doc.data(),dir:'in'})));
  rows.sort((a,b)=>b.createdAt?.toMillis?.()-a.createdAt?.toMillis?.());
  listEl.innerHTML='';
  rows.forEach(r=>{
    const li=document.createElement('li');
    const dt=r.createdAt && r.createdAt.toDate? r.createdAt.toDate(): (r.createdAt instanceof Date? r.createdAt:new Date());
    const sign=r.dir==='out'?'-':'+';
    li.textContent=`${dt.toLocaleString('fi-FI')} ${sign}${r.amount} € ${r.dir==='out'?('→ '+r.toIban):('← '+r.fromIban)}${r.invoiceRef?(' (Viite '+r.invoiceRef+')'):''}`;
    listEl.appendChild(li);
  });
}

// ============================
// Admin invoice creation
// ============================
async function adminCreateInvoice(){
  if(!isCurrentAdmin()){alert('Ei oikeuksia');return;}
  const iban=document.getElementById('admin-invoice-iban').value.trim().toUpperCase();
  const amt=parseFloat(document.getElementById('admin-invoice-amount').value);
  const msg=document.getElementById('admin-invoice-message').value.trim()||null;
  if(!iban||isNaN(amt)||amt<=0){alert('Täytä IBAN ja summa');return;}
  const ref=genInvoiceRef();
  // resolve user if IBAN belongs to registered account
  const acct=await findAccountByIban(iban);
  await db.collection('invoices').add({
    ref,toIban:iban,userId:acct?acct.userId:null,amount:amt,message:msg,status:'open',createdAt:new Date(),paidAt:null,paidFromIban:null
  });
  alert('Lasku luotu. Viite: '+ref);
  document.getElementById('admin-invoice-iban').value='';
  document.getElementById('admin-invoice-amount').value='';
  document.getElementById('admin-invoice-message').value='';
}

// ============================
// Loans
// ============================
async function requestLoan(){
  const uid=requireLogin(); if(!uid) return;
  const amt=parseFloat(document.getElementById('loan-amount').value);
  if(isNaN(amt)||amt<=0){alert('Anna summa');return;}
  await db.collection('loans').add({userId:uid,amount:amt,status:'pending',createdAt:new Date(),decidedAt:null});
  alert('Lainapyyntö lähetetty');
  document.getElementById('loan-amount').value='';
  loadUserLoans();
}

async function loadUserLoans(){
  const uid=requireLogin(); if(!uid) return;
  const ul=document.getElementById('user-loans'); if(!ul) return;
  const snap=await db.collection('loans').where('userId','==',uid).get();
  ul.innerHTML='';
  snap.forEach(d=>{const L=d.data();const li=document.createElement('li');li.textContent=`${L.amount} € – ${L.status}`;ul.appendChild(li);});
}

async function loadAdminLoanRequests(){
  if(!isCurrentAdmin()) return;
  const ul=document.getElementById('loan-requests'); if(!ul) return;
  const snap=await db.collection('loans').where('status','==','pending').get();
  ul.innerHTML='';
  snap.forEach(d=>{const L=d.data();const li=document.createElement('li');li.innerHTML=`${L.userId}: ${L.amount} € <button onclick=\"adminApproveLoan('${d.id}',true)\">Hyväksy</button> <button onclick=\"adminApproveLoan('${d.id}',false)\">Hylkää</button>`;ul.appendChild(li);});
}

async function adminApproveLoan(id,approve){
  if(!isCurrentAdmin()){alert('Ei oikeuksia');return;}
  const ref=db.collection('loans').doc(id);
  const snap=await ref.get(); if(!snap.exists) return;
  const L=snap.data();
  const newStatus=approve?'approved':'rejected';
  await ref.update({status:newStatus,decidedAt:new Date()});
  if(approve){
    // credit user's main account
    const acct=await fetchAccounts(L.userId); // returns arr; main assumed [0]
    if(acct.length){
      const mainRef=db.collection('users').doc(L.userId).collection('accounts').doc(acct[0].acctId);
      await db.runTransaction(async(tx)=>{const s=await tx.get(mainRef);const bal=s.data().balance||0;tx.update(mainRef,{balance:bal+L.amount});});
    }
  }
  loadAdminLoanRequests();
}

// ============================
// Page init dispatcher
// ============================
(async function init(){
  const page=document.documentElement.dataset.page;
  const uid=localStorage.getItem('currentUserId');
  if(uid){ // auto session
    if(page==='dashboard'){
      document.getElementById('auth-section').style.display='none';
      document.getElementById('main-section').style.display='block';
      document.getElementById('welcome-text').innerText=`Tervetuloa ${uid}`;
      if(isCurrentAdmin()) document.getElementById('admin-nav').style.display='block';
      await loadAccountsSummary();
    }
    if(page==='payments'){
      await loadAccountsSummary(); // caches accounts
      await populateAccountSelects();
      loadTransferHistory();
    }
    if(page==='investments'){
      loadInvestmentTargets();
    }
    if(page==='loans'){
      loadUserLoans();
    }
    if(page==='admin'){
      if(!isCurrentAdmin()){alert('Ei oikeuksia');goPage('index.html');return;}
      loadAdminLoanRequests();
    }
  }
})();

// ============================
// Investment data (CoinGecko & Yahoo) -- same as before simplified below
// ============================
const cryptoMap={BTC:'bitcoin',ETH:'ethereum',BNB:'binancecoin',SOL:'solana',XRP:'ripple'};
const stockMap={NOKIA:'NOKIA.HE',KONE:'KNEBV.HE',FORTUM:'FORTUM.HE',SAMPO:'SAMPO.HE',NESTE:'NESTE.HE'};

function onInvestmentTargetChange(){const symbol=document.getElementById('investment-target').value;startAutoUpdate(symbol);}  

function loadInvestmentTargets(){
  const targets=[{id:'BTC',name:'Bitcoin'},{id:'ETH',name:'Ethereum'},{id:'BNB',name:'Binance Coin'},{id:'SOL',name:'Solana'},{id:'XRP',name:'Ripple'},{id:'NOKIA',name:'Nokia Oyj'},{id:'KONE',name:'KONE Oyj'},{id:'FORTUM',name:'Fortum Oyj'},{id:'SAMPO',name:'Sampo Oyj'},{id:'NESTE',name:'Neste Oyj'}];
  const sel=document.getElementById('investment-target'); if(!sel) return;
  sel.innerHTML=''; targets.forEach(t=>{const opt=document.createElement('option');opt.value=t.id;opt.textContent=t.name;sel.appendChild(opt);});
  startAutoUpdate(targets[0].id);
}

function startAutoUpdate(symbol){ if(autoUpdateInterval) clearInterval(autoUpdateInterval); loadInvestmentGraph(symbol); autoUpdateInterval=setInterval(()=>loadInvestmentGraph(symbol),10000); }

async function loadInvestmentGraph(symbol){
  currentSymbol=symbol;
  const ctx=document.getElementById('investmentChart').getContext('2d');
  let labels=[],prices=[];
  try{
    if(cryptoMap[symbol]){
      const id=cryptoMap[symbol];
      const url=`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=eur&days=30`;
      const res=await fetch(url);const data=await res.json();
      labels=data.prices.map(p=>new Date(p[0]).toLocaleDateString('fi-FI',{day:'2-digit',month:'short'}));
      prices=data.prices.map(p=>p[1]);
    }else if(stockMap[symbol]){
      const t=stockMap[symbol];
      const url=`https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${t}?range=1mo&interval=1d`;
      const res=await fetch(url);const json=await res.json();
      const r=json.chart.result[0];
      labels=r.timestamp.map(ts=>new Date(ts*1000).toLocaleDateString('fi-FI',{day:'2-digit',month:'short'}));
      prices=r.indicators.quote[0].close;
    }
    if(investmentChart) investmentChart.destroy();
    investmentChart=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:symbol,data:prices,borderColor:'blue',backgroundColor:'rgba(0,0,255,0.1)',fill:true}]},options:{responsive:true}});
  }catch(err){console.error('Virhe ladattaessa dataa:',err);}  
}

// --- Placeholder invest/redeem (extend as needed)
function invest(){alert('Sijoitus (demo)');}
function redeemInvestment(){alert('Lunastus (demo)');}

</script>

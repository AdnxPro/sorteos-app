import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { 
  Users, Ticket, Trophy, Plus, Search, 
  X, Lock, Settings, Cloud, AlertCircle, CheckCircle2,
  Filter, History, KeyRound, UserCheck, Edit2, Trash2, ChevronDown, ChevronUp,
  ShieldCheck
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyA0xWyeghwJQEAxww58dOSMYvfGWCoxAGQ",
  authDomain: "sorteo-premium-a64aa.firebaseapp.com",
  projectId: "sorteo-premium-a64aa",
  storageBucket: "sorteo-premium-a64aa.firebasestorage.app",
  messagingSenderId: "752623111799",
  appId: "1:752623111799:web:a5aa485e672dbe4d964072"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'sorteo-premium-a64aa';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('consulta'); 
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('sorteos_is_admin') === 'true');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  
  const [buyers, setBuyers] = useState([]);
  const [draws, setDraws] = useState([]);
  
  const [clientTicket, setClientTicket] = useState(null);
  const [ticketInput, setTicketInput] = useState('');

  const [confirmModal, setConfirmModal] = useState(null);
  const [drawWinnerResult, setDrawWinnerResult] = useState(null);
  const [notification, setNotification] = useState(null);

  const [appConfig, setAppConfig] = useState(() => {
    const saved = localStorage.getItem('sorteos_app_config');
    return saved ? JSON.parse(saved) : { adminPassword: '1234' };
  });

  const [drawConfig, setDrawConfig] = useState(() => {
    const saved = localStorage.getItem('sorteos_config');
    return saved ? JSON.parse(saved) : { title: 'Sorteo General', planId: 'default' };
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editBuyerData, setEditBuyerData] = useState(null);
  const [ticketModal, setTicketModal] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const initAuth = async () => {
  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error("Error de autenticación:", error);
  }
};
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const buyersRef = collection(db, 'artifacts', appId, 'public', 'data', 'buyers');
    const unsubscribeBuyers = onSnapshot(buyersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setBuyers(data.sort((a, b) => new Date(b.regDate) - new Date(a.regDate)));
    }, (err) => console.error(err));

    const drawsRef = collection(db, 'artifacts', appId, 'public', 'data', 'draws');
    const unsubscribeDraws = onSnapshot(drawsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setDraws(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    }, (err) => console.error(err));

    return () => {
      unsubscribeBuyers();
      unsubscribeDraws();
    };
  }, [user]);

  useEffect(() => {
    localStorage.setItem('sorteos_config', JSON.stringify(drawConfig));
    localStorage.setItem('sorteos_app_config', JSON.stringify(appConfig));
    localStorage.setItem('sorteos_is_admin', isAdmin);
  }, [drawConfig, appConfig, isAdmin]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPass === appConfig.adminPassword) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPass('');
      setActiveTab('participantes');
      setNotification({ type: 'success', text: 'Acceso Administrador' });
    } else {
      setNotification({ type: 'error', text: 'Contraseña incorrecta' });
    }
  };

  const handleClientLogin = (e) => {
    e.preventDefault();
    const found = buyers.find(b => b.transactionCode?.toUpperCase() === ticketInput.trim().toUpperCase());
    if (found) {
      setClientTicket(found);
      setNotification({ type: 'success', text: `Bienvenido, ${found.name}` });
    } else {
      setNotification({ type: 'error', text: 'Código no encontrado' });
    }
  };

  const logoutAdmin = () => {
    setIsAdmin(false);
    setClientTicket(null);
    setActiveTab('consulta');
  };

  const changeAdminPassword = (newPass) => {
    if (newPass.length < 4) {
      setNotification({ type: 'error', text: 'La clave debe tener al menos 4 dígitos' });
      return;
    }
    setAppConfig({ ...appConfig, adminPassword: newPass });
    setShowSettings(false);
    setNotification({ type: 'success', text: 'Clave actualizada correctamente' });
  };

  const saveDrawSettings = () => {
    const newPlanId = drawConfig.title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    setDrawConfig({ ...drawConfig, planId: newPlanId });
    setNotification({ type: 'success', text: 'Nuevo Plan Iniciado' });
  };

  const proceedWithDraw = async () => {
    if (!user) return;
    try {
      const participantsInPlan = buyers.filter(b => b.planId === drawConfig.planId);
      const winNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const winners = participantsInPlan.filter(b => String(b.number).padStart(3, '0') === winNum);
      
      const newDrawResult = {
        title: drawConfig.title,
        planId: drawConfig.planId,
        date: new Date().toISOString(),
        winningNumber: winNum,
        winners: winners,
        allParticipants: participantsInPlan,
        executedBy: user.uid
      };

      const drawsRef = collection(db, 'artifacts', appId, 'public', 'data', 'draws');
      await addDoc(drawsRef, newDrawResult);

      setConfirmModal(null);
      setDrawWinnerResult(newDrawResult);
      setNotification({ type: 'success', text: 'Sorteo finalizado' });
    } catch (err) {
      setNotification({ type: 'error', text: 'Error en la ejecución' });
    }
  };

  const addBuyer = async (buyerData) => {
    if (!user) return;
    const formattedNum = String(buyerData.number).padStart(3, '0');
    const isDuplicate = buyers.some(b => b.planId === drawConfig.planId && String(b.number).padStart(3, '0') === formattedNum);
    
    if (isDuplicate) {
      setNotification({ type: 'error', text: `El número ${formattedNum} ya ha sido vendido.` });
      return;
    }

    try {
      const transactionCode = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${formattedNum}`;
      const newBuyer = { 
        ...buyerData, 
        number: formattedNum,
        transactionCode,
        planId: drawConfig.planId, 
        planTitle: drawConfig.title,
        regDate: new Date().toISOString(),
        createdBy: user.uid
      };

      const buyersRef = collection(db, 'artifacts', appId, 'public', 'data', 'buyers');
      const docRef = await addDoc(buyersRef, newBuyer);
      
      setShowAddForm(false);
      setTicketModal({ ...newBuyer, id: docRef.id });
      setNotification({ type: 'success', text: `Número ${formattedNum} registrado` });
    } catch (error) {
      setNotification({ type: 'error', text: 'Error al registrar' });
    }
  };

  const updateBuyer = async (id, updatedData) => {
    if (!user) return;
    try {
      const buyerRef = doc(db, 'artifacts', appId, 'public', 'data', 'buyers', id);
      await updateDoc(buyerRef, updatedData);
      setEditBuyerData(null);
      setNotification({ type: 'success', text: 'Datos actualizados' });
    } catch (error) {
      setNotification({ type: 'error', text: 'Error al actualizar' });
    }
  };

  const deleteBuyer = async (id) => {
    if (!user) return;
    try {
      const buyerRef = doc(db, 'artifacts', appId, 'public', 'data', 'buyers', id);
      await deleteDoc(buyerRef);
      setNotification({ type: 'success', text: 'Venta anulada correctamente' });
      setConfirmModal(null);
    } catch (error) {
      setNotification({ type: 'error', text: 'Error al anular' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24 md:max-w-md md:mx-auto md:shadow-2xl relative overflow-x-hidden">
      
      {notification && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top-10 transition-all border ${notification.type === 'success' ? 'bg-slate-900 text-amber-400 border-amber-500/30' : 'bg-red-600 text-white border-red-400'}`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-black text-[10px] uppercase tracking-widest leading-tight">{notification.text}</span>
        </div>
      )}

      <header className="bg-white p-5 sticky top-0 z-30 flex justify-between items-center border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black tracking-tighter uppercase text-slate-900 flex items-center">
            Sorteos Cloud <Cloud size={18} className="ml-2 text-blue-500" />
          </h1>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Panel de Control</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <Settings size={20} />
            </button>
          )}
          <button 
            onClick={isAdmin ? logoutAdmin : () => setShowAdminLogin(true)}
            className={`text-[10px] font-black px-4 py-2 rounded-xl uppercase shadow-sm ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-slate-900 text-white'}`}
          >
            {isAdmin ? 'Cerrar Admin' : 'Admin'}
          </button>
        </div>
      </header>

      <main className="p-4">
        {activeTab === 'consulta' && (
          <div className="space-y-6">
            {!clientTicket ? (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <KeyRound size={30} />
                </div>
                <h2 className="text-xl font-black uppercase mb-2">Portal del Cliente</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">Ingresa el código de tu ticket para ver tus datos e historial</p>
                
                <form onSubmit={handleClientLogin} className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="REF-XXXXXX-000" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-center font-black text-blue-600 placeholder:text-slate-300 uppercase tracking-widest"
                    value={ticketInput}
                    onChange={(e) => setTicketInput(e.target.value)}
                  />
                  <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-[10px]">Consultar Mis Datos</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-blue-600 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                   <div className="relative z-10">
                     <p className="text-[8px] font-black opacity-60 uppercase tracking-[0.2em] mb-1">Sesión Activa de:</p>
                     <h2 className="text-2xl font-black uppercase leading-tight mb-4">{clientTicket.name}</h2>
                     <button onClick={() => {setClientTicket(null); setTicketInput('');}} className="bg-white/20 hover:bg-white/30 text-white text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest">Cerrar Sesión</button>
                   </div>
                   <UserCheck className="absolute -bottom-4 -right-4 opacity-10 w-32 h-32" />
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                   <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-slate-900 text-amber-400 rounded-xl"><Ticket size={20}/></div>
                      <h3 className="font-black uppercase text-xs">Tu Compra Actual</h3>
                   </div>
                   <div className="flex justify-between items-end">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase">{clientTicket.planTitle}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Cédula: {clientTicket.cedula}</p>
                        <p className="text-[10px] font-bold text-slate-500">Tel: {clientTicket.phone}</p>
                      </div>
                      <div className="bg-slate-900 px-6 py-3 rounded-2xl text-4xl font-black text-amber-400 font-mono shadow-inner tracking-tighter">
                         {clientTicket.number}
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center">
                    <History size={14} className="mr-2"/> Tu Historial de Sorteos
                  </h3>
                  {draws.filter(d => d.allParticipants?.some(p => p.transactionCode === clientTicket.transactionCode)).length > 0 ? (
                    draws.filter(d => d.allParticipants?.some(p => p.transactionCode === clientTicket.transactionCode)).map(d => (
                      <div key={d.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase">{d.title}</p>
                          <p className="text-[8px] font-bold text-slate-400 mt-0.5">{new Date(d.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`text-[8px] font-black px-2 py-1 rounded ${d.winners?.some(w => w.transactionCode === clientTicket.transactionCode) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {d.winners?.some(w => w.transactionCode === clientTicket.transactionCode) ? 'GANASTE' : 'PARTICIPADO'}
                          </span>
                          <div className="bg-slate-50 text-slate-400 px-2 py-1 rounded font-mono font-black text-xs">{d.winningNumber}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-slate-100 p-8 rounded-[2rem] text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase">No hay resultados registrados aún</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'participantes' && isAdmin && (
          <ParticipantesView 
            buyers={buyers} 
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            onSave={addBuyer}
            onEdit={(b) => setEditBuyerData(b)}
            onDelete={(b) => setConfirmModal({
              title: 'Anular Venta',
              message: `¿Estás seguro de eliminar la venta de ${b.name}? El número ${b.number} volverá a estar disponible.`,
              action: () => deleteBuyer(b.id)
            })}
            onViewTicket={(b) => setTicketModal(b)}
            drawConfig={drawConfig}
            setDrawConfig={setDrawConfig}
            onSaveConfig={saveDrawSettings}
            onExecute={() => setConfirmModal({
              title: 'Ejecutar Sorteo',
              message: `¿Realizar sorteo para "${drawConfig.title}"?`,
              action: proceedWithDraw
            })}
          />
        )}

        {activeTab === 'resultados' && isAdmin && (
          <ResultadosView draws={draws} />
        )}
      </main>

      <nav className="bg-white border-t border-slate-200 fixed bottom-0 w-full md:max-w-md flex justify-around p-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-30">
        <NavItem 
          icon={<Search size={22} />} 
          label="Consulta" 
          active={activeTab === 'consulta'} 
          onClick={() => setActiveTab('consulta')} 
        />
        {isAdmin && (
          <>
            <NavItem 
              icon={<Users size={22} />} 
              label="Ventas" 
              active={activeTab === 'participantes'} 
              onClick={() => setActiveTab('participantes')} 
            />
            <NavItem 
              icon={<History size={22} />} 
              label="Historial" 
              active={activeTab === 'resultados'} 
              onClick={() => setActiveTab('resultados')} 
            />
          </>
        )}
      </nav>

      {/* Modales */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[80] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 text-center">
            <h3 className="text-xl font-black mb-2 uppercase">{confirmModal.title}</h3>
            <p className="text-slate-500 text-[10px] mb-6 font-bold uppercase leading-relaxed">{confirmModal.message}</p>
            <div className="space-y-3">
              <button onClick={confirmModal.action} className="w-full bg-slate-900 text-amber-400 font-black py-4 rounded-xl text-[10px] uppercase shadow-lg">Confirmar</button>
              <button onClick={() => setConfirmModal(null)} className="w-full bg-slate-100 text-slate-400 font-black py-4 rounded-xl text-[10px] uppercase">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {drawWinnerResult && (
        <div className="fixed inset-0 bg-slate-900 z-[90] flex items-center justify-center p-6">
          <div className="w-full max-w-xs text-center space-y-8">
            <Trophy size={80} className="text-amber-400 mx-auto animate-bounce" />
            <div className="bg-white rounded-[3rem] p-10 shadow-2xl">
              <p className="text-slate-400 font-black text-[10px] uppercase mb-4 tracking-widest">Número Ganador</p>
              <h1 className="text-8xl font-black text-slate-900 font-mono">{drawWinnerResult.winningNumber}</h1>
            </div>
            <button onClick={() => setDrawWinnerResult(null)} className="w-full bg-white text-slate-900 font-black py-5 rounded-2xl uppercase text-xs">Cerrar</button>
          </div>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 text-center shadow-2xl">
            <Lock size={32} className="mx-auto text-blue-600 mb-4" />
            <h3 className="text-xl font-black mb-6 uppercase tracking-tight">Acceso Admin</h3>
            <form onSubmit={handleAdminLogin}>
              <input autoFocus type="password" placeholder="••••" className="w-full text-center text-4xl font-bold py-4 bg-slate-50 rounded-2xl mb-4 tracking-[0.5rem]" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
              <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-xs uppercase">Entrar</button>
              <button type="button" onClick={() => setShowAdminLogin(false)} className="text-slate-400 font-bold text-[10px] uppercase mt-4">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal 
          currentPass={appConfig.adminPassword}
          onSave={changeAdminPassword} 
          onCancel={() => setShowSettings(false)} 
        />
      )}

      {editBuyerData && (
        <EditBuyerForm 
          data={editBuyerData} 
          onSave={(updated) => updateBuyer(editBuyerData.id, updated)} 
          onCancel={() => setEditBuyerData(null)} 
        />
      )}

      {ticketModal && <TicketModal buyer={ticketModal} onClose={() => setTicketModal(null)} />}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full transition-all ${active ? 'text-slate-900 scale-110' : 'text-slate-300'}`}>
      {icon}
      <span className="text-[9px] mt-1 font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function ParticipantesView({ buyers, showAddForm, setShowAddForm, onSave, onEdit, onDelete, onViewTicket, drawConfig, setDrawConfig, onSaveConfig, onExecute }) {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = buyers
    .filter(b => b.planId === drawConfig.planId)
    .filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(b.number).includes(searchTerm));

  if (showAddForm) return <AddBuyerForm onSave={onSave} onCancel={() => setShowAddForm(false)} planTitle={drawConfig.title} />;

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 mb-2">
           <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Filter size={16} /></div>
           <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-500">Configuración de Sorteo</h3>
        </div>
        <input 
          type="text" 
          placeholder="Nombre del Sorteo..." 
          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold text-sm"
          value={drawConfig.title}
          onChange={(e) => setDrawConfig({...drawConfig, title: e.target.value})}
        />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onSaveConfig} className="bg-slate-100 text-slate-600 font-black py-3 rounded-xl text-[9px] uppercase">Nuevo Sorteo</button>
          <button onClick={onExecute} className="bg-slate-900 text-amber-400 font-black py-3 rounded-xl text-[9px] uppercase shadow-lg">Ejecutar</button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Buscar por nombre o número..." 
              className="w-full bg-white border border-slate-200 rounded-xl p-3 pl-10 text-xs font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          </div>
          <button onClick={() => setShowAddForm(true)} className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg">
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {filtered.map(b => (
            <div key={b.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
              <div className="flex-1" onClick={() => onViewTicket(b)}>
                <h4 className="font-black text-slate-800 uppercase text-[10px]">{b.name}</h4>
                <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">ID: {b.transactionCode}</p>
                <p className="text-[8px] font-bold text-slate-500">{b.phone}</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex flex-col space-y-1">
                  <button onClick={() => onEdit(b)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Edit2 size={12} /></button>
                  <button onClick={() => onDelete(b)} className="p-1.5 bg-red-50 text-red-600 rounded-lg"><Trash2 size={12} /></button>
                </div>
                <div className="bg-slate-900 px-3 py-2 rounded-xl text-lg font-black text-amber-400 font-mono shadow-inner min-w-[50px] text-center">
                  {b.number}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-slate-100 p-8 rounded-[2rem] text-center border-2 border-dashed border-slate-200">
               <p className="text-[10px] font-black text-slate-400 uppercase">Sin resultados en "{drawConfig.title}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ currentPass, onSave, onCancel }) {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const handleSave = () => {
    if (newPass !== confirmPass) return;
    onSave(newPass);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[120] flex items-center justify-center p-6 backdrop-blur-md">
      <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <ShieldCheck size={32} />
          </div>
        </div>
        <h3 className="text-xl font-black mb-2 uppercase tracking-tight text-center">Seguridad Admin</h3>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center mb-6 leading-relaxed">Actualiza tu clave de acceso de 4 dígitos</p>
        
        <div className="space-y-4">
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nueva Clave</label>
            <input 
              type="password" 
              maxLength={4}
              placeholder="••••" 
              className="w-full text-center text-3xl font-bold py-4 bg-slate-50 border border-slate-100 rounded-2xl mt-1 tracking-[0.5rem]" 
              value={newPass} 
              onChange={e => setNewPass(e.target.value.replace(/\D/g, ''))} 
            />
          </div>
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase ml-2 tracking-widest">Confirmar Clave</label>
            <input 
              type="password" 
              maxLength={4}
              placeholder="••••" 
              className={`w-full text-center text-3xl font-bold py-4 bg-slate-50 border rounded-2xl mt-1 tracking-[0.5rem] ${confirmPass && newPass !== confirmPass ? 'border-red-400' : 'border-slate-100'}`} 
              value={confirmPass} 
              onChange={e => setConfirmPass(e.target.value.replace(/\D/g, ''))} 
            />
          </div>
          
          <div className="pt-4 space-y-3">
            <button 
              disabled={!newPass || newPass !== confirmPass || newPass.length < 4}
              onClick={handleSave} 
              className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-xs uppercase disabled:opacity-30 shadow-lg"
            >
              Guardar Cambios
            </button>
            <button onClick={onCancel} className="w-full text-slate-400 font-bold text-[10px] uppercase py-2">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddBuyerForm({ onSave, onCancel, planTitle }) {
  const [formData, setFormData] = useState({ name: '', cedula: '', phone: '', number: '', currency: 'C$', amount: '' });
  
  const handleAmountChange = (val) => {
    const clean = val.replace(/\D/g, '');
    setFormData({...formData, amount: clean});
  };

  const handleSubmit = (e) => { 
    e.preventDefault(); 
    if (formData.phone.length < 8) return;
    onSave(formData); 
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-bottom-10 border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase leading-none">Nueva Venta</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sorteo: {planTitle}</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 bg-slate-50 w-10 h-10 rounded-full flex items-center justify-center"><X size={20} /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required placeholder="Nombre Completo" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <div className="grid grid-cols-2 gap-3">
          <input required placeholder="Cédula" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value})} />
          <input required placeholder="Número (000)" className="w-full bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-center text-xl font-black text-amber-600" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value.replace(/\D/g, '').substring(0,3)})} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input required placeholder="Teléfono" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          <div className="flex">
            <select className="bg-slate-200 rounded-l-xl px-2 font-black text-[10px]" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}><option value="C$">C$</option><option value="$">$</option></select>
            <input required placeholder="Monto" className="w-full bg-slate-50 border border-slate-100 rounded-r-xl p-4 font-bold text-sm" value={formData.amount} onChange={e => handleAmountChange(e.target.value)} />
          </div>
        </div>
        <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-[10px] mt-4">Registrar Venta</button>
      </form>
    </div>
  );
}

function EditBuyerForm({ data, onSave, onCancel }) {
  const [formData, setFormData] = useState({ ...data });

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl">
        <h2 className="text-xl font-black text-slate-900 uppercase mb-6 text-center">Editar Cliente</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Nombre</label>
            <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-bold text-xs mt-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Cédula</label>
            <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-bold text-xs mt-1" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value})} />
          </div>
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Teléfono</label>
            <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 font-bold text-xs mt-1" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button onClick={onCancel} className="bg-slate-100 text-slate-400 font-black py-4 rounded-xl text-[10px] uppercase">Cancelar</button>
            <button onClick={() => onSave(formData)} className="bg-slate-900 text-white font-black py-4 rounded-xl text-[10px] uppercase">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultadosView({ draws }) {
  const [expandedDraw, setExpandedDraw] = useState(null);
  return (
    <div className="space-y-5 animate-in slide-in-from-right-4">
      <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center ml-1"><History size={16} className="mr-2" /> Historial de Sorteos</h2>
      {draws.map(d => (
        <div key={d.id} className="bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm transition-all">
          <div onClick={() => setExpandedDraw(expandedDraw === d.id ? null : d.id)} className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50">
            <div className="flex-1">
              <h3 className="font-black text-slate-900 uppercase text-[11px] leading-tight">{d.title}</h3>
              <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">{new Date(d.date).toLocaleString()}</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg font-black text-xl font-mono border border-amber-200">
                  {d.winningNumber}
              </div>
              {expandedDraw === d.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
          {expandedDraw === d.id && (
            <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-4 max-h-64 overflow-y-auto">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Participantes en este sorteo ({d.allParticipants?.length || 0}):</p>
              <div className="space-y-2">
                {d.allParticipants?.map((p, idx) => {
                  const isWinner = String(p.number).padStart(3, '0') === String(d.winningNumber).padStart(3, '0');
                  return (
                    <div key={idx} className={`p-3 rounded-xl border flex justify-between items-center ${isWinner ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
                      <div>
                        <p className={`font-black text-[9px] uppercase ${isWinner ? 'text-amber-700' : 'text-slate-700'}`}>{p.name}</p>
                        <p className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase">{p.transactionCode}</p>
                      </div>
                      <div className={`font-mono font-black text-sm ${isWinner ? 'text-amber-600' : 'text-slate-400'}`}>
                        {p.number}
                        {isWinner && <Trophy size={12} className="inline ml-1" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
      {draws.length === 0 && (
        <div className="bg-slate-100 p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
           <p className="text-[10px] font-black text-slate-400 uppercase">No hay sorteos ejecutados</p>
        </div>
      )}
    </div>
  );
}

function TicketModal({ buyer, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/95 z-[110] flex items-center justify-center p-6 backdrop-blur-xl">
      <div className="bg-white w-full max-w-[320px] rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/20">
        <div className="bg-slate-50 p-8 text-center border-b border-slate-100 relative">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comprobante Oficial</p>
          <h2 className="text-lg font-black text-slate-900 uppercase mt-1">{buyer.planTitle}</h2>
          <Cloud size={14} className="absolute top-4 right-8 text-blue-500 opacity-30" />
        </div>
        <div className="p-8 text-center">
          <div className="bg-white rounded-[2.5rem] border-[6px] border-slate-900 p-8 shadow-2xl inline-block mb-6 transform -rotate-1">
             <h2 className="text-7xl font-black text-slate-900 font-mono tracking-tighter">{buyer.number}</h2>
          </div>
          <div className="space-y-4">
             <p className="font-black text-xl text-slate-900 uppercase leading-none">{buyer.name}</p>
             <div className="pt-6 border-t border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">CÓDIGO DE ACCESO PRIVADO</p>
                <div className="font-mono text-[11px] font-black text-blue-600 bg-blue-50 py-4 px-4 rounded-2xl border border-blue-100 select-all shadow-inner">
                  {buyer.transactionCode}
                </div>
                <p className="text-[8px] font-bold text-slate-400 mt-3 uppercase leading-relaxed px-4">
                  Entrega este código al cliente para que consulte sus sorteos.
                </p>
             </div>
          </div>
        </div>
        <button onClick={onClose} className="w-full bg-slate-900 text-amber-400 font-black py-7 rounded-b-[3.5rem] uppercase tracking-widest text-[11px]">Finalizar y Cerrar</button>
      </div>
    </div>
  );
}
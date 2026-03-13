import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, doc, setDoc, deleteDoc, updateDoc, getDoc
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  Sword, Shield, Book, LayoutDashboard, 
  LogOut, Plus, Trash2, ChevronRight, 
  Users, Home, MessageSquare, AlertTriangle,
  Camera, Film, Image as ImageIcon, Play, Link as LinkIcon,
  Settings, CheckCircle2, Loader2, Palette, RefreshCw, Lock, User
} from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE (CHAVES REAIS DO RAFA) ---
const firebaseConfig = {
  apiKey: "AIzaSyDhATgpXHx05KdkxKvvdyoCGLem8875_4k",
  authDomain: "nemesis-portal.firebaseapp.com",
  projectId: "nemesis-portal",
  storageBucket: "nemesis-portal.firebasestorage.app",
  messagingSenderId: "866418817027",
  appId: "1:866418817027:web:87a7fc61ad596ca9d27636",
  measurementId: "G-BXC92BNY27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'nemesis-2-app';

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState(null); 
  const [adminPass, setAdminPass] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // Definições de aparência
  const [siteSettings, setSiteSettings] = useState({
    logoUrl: 'server-icon.jpg',
    siteName: 'NÊMESIS 2'
  });

  // Configurações GitHub
  const [ghConfig, setGhConfig] = useState({ token: '', owner: '', repo: '', path: 'media' });
  const [showSettings, setShowSettings] = useState(false);

  // Estados de Postagem
  const [newPost, setNewPost] = useState({ title: '', content: '', mediaUrl: '', mediaType: 'image' });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Inicialização e Auth
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Erro na autenticação:", e);
        }
      }
      setUser(u);
    });
    return () => unsubscribeAuth();
  }, []);

  // Sincronização em tempo real
  useEffect(() => {
    if (!user) return;
    
    // Mural de Transmissões
    const postsCol = collection(db, 'artifacts', appId, 'public', 'data', 'posts');
    const unsubscribePosts = onSnapshot(postsCol, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      setLoading(false);
    }, (err) => {
      console.error("Erro ao carregar posts:", err);
      setLoading(false);
    });

    // Logo e Nome do Site
    const siteConfigDoc = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'site');
    const unsubscribeSite = onSnapshot(siteConfigDoc, (snap) => {
      if (snap.exists()) setSiteSettings(snap.data());
    });

    // Credenciais GitHub (Privadas)
    const configDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'config', 'github');
    getDoc(configDoc).then(snap => {
      if (snap.exists()) setGhConfig(snap.data());
    });

    return () => {
      unsubscribePosts();
      unsubscribeSite();
    };
  }, [user]);

  // Função para salvar configurações do GitHub no banco de dados
  const saveGhConfig = async () => {
    if (!user) return;
    try {
      const configDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'config', 'github');
      await setDoc(configDoc, ghConfig);
      setShowSettings(false);
      setUploadProgress('Configurações Gravadas!');
      setTimeout(() => setUploadProgress(''), 2000);
    } catch (err) {
      console.error("Falha ao gravar definições:", err);
    }
  };

  // Lógica de Upload para o GitHub via API
  const uploadToGitHub = async (file, subPath = null) => {
    if (!ghConfig.token || !ghConfig.owner || !ghConfig.repo) {
      alert("Configura o Token do GitHub no painel Master!");
      return null;
    }
    const path = subPath || ghConfig.path;
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        const content = reader.result.split(',')[1];
        setUploadProgress('Sincronizando com a Arca...');
        try {
          const response = await fetch(
            `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/contents/${path}/${fileName}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${ghConfig.token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `Upload via Terminal: ${fileName}`,
                content: content,
              }),
            }
          );
          if (!response.ok) throw new Error('Falha GitHub API');
          const data = await response.json();
          resolve(data.content.download_url);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const url = await uploadToGitHub(file);
      if (url) {
        setNewPost(prev => ({ ...prev, mediaUrl: url, mediaType: type }));
        setUploadProgress('Ficheiro Preparado!');
      }
    } catch (err) {
      alert("Erro ao enviar ficheiro. Verifica as credenciais Master.");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(''), 3000);
    }
  };

  const handleLogoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToGitHub(file, 'system');
      if (url) {
        const siteConfigDoc = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'site');
        await setDoc(siteConfigDoc, { ...siteSettings, logoUrl: url }, { merge: true });
      }
    } catch (err) { alert("Erro ao atualizar identidade."); }
    finally { setIsUploading(false); }
  };

  // Gestão de Login Multinível
  const handleLogin = (e) => {
    e.preventDefault();
    if (adminPass === 'ROGZINHU-T10b20cd00n804') { 
      setIsAdmin(true); setAdminRole('master'); setAdminPass('');
    } else if (adminPass === 'ADMNEMESIS15') {
      setIsAdmin(true); setAdminRole('admin'); setAdminPass('');
    } else {
      const err = document.getElementById('login-err');
      if (err) {
        err.classList.remove('hidden');
        setTimeout(() => err.classList.add('hidden'), 3000);
      }
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!user || !newPost.title || !newPost.content) return;
    const postsCol = collection(db, 'artifacts', appId, 'public', 'data', 'posts');
    await addDoc(postsCol, {
      ...newPost,
      author: adminRole === 'master' ? 'Master Comandante' : 'Operador ADM',
      timestamp: Date.now()
    });
    setNewPost({ title: '', content: '', mediaUrl: '', mediaType: 'image' });
  };

  const deletePost = async (id) => {
    if (adminRole !== 'master') return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posts', id));
  };

  // Dados das Nações
  const andromeda = ["Night", "Elma", "Netunolis", "Peixo", "Never", "Codein", "Virgula", "Little", "Rogzinhu", "Eddie", "Tio Thalys", "Yuri"];
  const helix = ["YasBruxa", "LeLeo", "Kirito", "Nisotto_", "daisukih", "TwinMilk", "FeehGaito", "Green Mage", "Fabrisla", "Oiyunao", "eclipsezero", "Flitz"];

  return (
    <div className="min-h-screen bg-[#010101] text-white selection:bg-yellow-500/30 font-sans overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-15%] left-[-15%] w-[70%] h-[70%] bg-purple-900 blur-[130px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[70%] h-[70%] bg-green-900 blur-[130px] rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <img src={String(siteSettings.logoUrl)} className="w-12 h-12 rounded-lg shadow-xl shadow-yellow-500/10 group-hover:scale-110 transition-all object-cover" />
            <span className="font-black text-2xl tracking-tighter italic uppercase">{String(siteSettings.siteName)}</span>
          </div>
          <div className="flex items-center gap-3 md:gap-8">
            <NavBtn active={activeTab === 'home'} onClick={() => setActiveTab('home')} Icon={Home} label="Início" />
            <NavBtn active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} Icon={Book} label="Lore" />
            <NavBtn active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} Icon={Users} label="Nações" />
            <button onClick={() => setActiveTab('admin')} className={`p-3 rounded-xl transition ${activeTab === 'admin' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-400 hover:bg-white/5'}`}>
              <LayoutDashboard size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        
        {/* HOME / FEED */}
        {activeTab === 'home' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero */}
            <div className="relative rounded-[3rem] overflow-hidden aspect-[21/9] flex items-center justify-center border border-white/5 shadow-2xl group">
              <img src={String(siteSettings.logoUrl)} className="absolute inset-0 w-full h-full object-cover brightness-[0.2] scale-105 group-hover:scale-100 transition-transform duration-1000" />
              <div className="relative text-center px-4">
                <div className="flex justify-center mb-6"><div className="px-4 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 text-[10px] font-black tracking-[0.3em] uppercase animate-pulse">Sistema Sincronizado</div></div>
                <h2 className="text-yellow-500 font-black text-5xl md:text-8xl mb-4 tracking-tighter uppercase italic drop-shadow-2xl">Nações</h2>
                <p className="text-gray-400 tracking-[0.5em] uppercase text-xs md:text-sm font-bold mb-10">Recuperação Planetária • Nível 02</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button onClick={() => setActiveTab('lore')} className="px-10 py-4 bg-white text-black font-black rounded-2xl hover:bg-yellow-500 transition-all flex items-center gap-2 transform hover:scale-105 shadow-2xl uppercase text-xs">
                    <Book size={18} /> Ler Lore
                  </button>
                  <button onClick={() => setActiveTab('teams')} className="px-10 py-4 bg-white/5 backdrop-blur-md border border-white/10 hover:border-white rounded-2xl font-black transition-all transform hover:scale-105 shadow-2xl uppercase text-xs">
                    Ver Times
                  </button>
                </div>
              </div>
            </div>

            {/* Feed Principal */}
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-10">
                <h3 className="text-2xl font-black flex items-center gap-3 px-2 uppercase italic tracking-tighter">
                  <MessageSquare size={24} className="text-yellow-500" /> Mural de Transmissões
                </h3>
                
                {loading ? (
                  <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-yellow-500" size={48} /></div>
                ) : posts.length === 0 ? (
                  <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] text-gray-600 font-black uppercase tracking-widest text-xs">Sem novas transmissões.</div>
                ) : (
                  posts.map(post => (
                    <article key={post.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl hover:border-white/10 transition-colors">
                      <div className="p-6 flex items-center gap-4 border-b border-white/5 bg-white/[0.01]">
                        <img src={String(siteSettings.logoUrl)} className="w-10 h-10 rounded-full border border-yellow-500/30 object-cover" />
                        <div>
                          <h4 className="font-black text-sm uppercase tracking-tight leading-none mb-1">{String(post.title || '')}</h4>
                          <div className="flex items-center gap-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                             <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{String(post.author || 'Protocolo')}</p>
                          </div>
                        </div>
                      </div>

                      {post.mediaUrl && (
                        <div className="w-full bg-black/40 flex items-center justify-center">
                          {post.mediaType === 'video' ? (
                            <video src={String(post.mediaUrl)} controls className="w-full max-h-[600px] object-contain" />
                          ) : (
                            <img src={String(post.mediaUrl)} className="w-full max-h-[600px] object-contain shadow-inner" alt="Mídia" />
                          )}
                        </div>
                      )}

                      <div className="p-8">
                        <div className="text-gray-300 text-lg whitespace-pre-wrap mb-6 font-medium leading-relaxed">{String(post.content || '')}</div>
                        <div className="flex items-center justify-between opacity-30">
                           <div className="text-[10px] font-black uppercase tracking-[0.2em] italic">Registro: {new Date(post.timestamp || Date.now()).toLocaleString()}</div>
                           <Shield size={14} />
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                <SideCard color="#bc13fe" name="Andromeda" desc="Restauração do passado. Ordem, disciplina e força militar." />
                <SideCard color="#22c55e" name="Helix" desc="Evolução do presente. Ciência, simbiose e adaptação natural." />
                <div className="bg-yellow-500/5 border border-yellow-500/20 p-8 rounded-[2rem] space-y-4 shadow-xl">
                   <h4 className="font-black uppercase text-yellow-500 flex items-center gap-2 tracking-tighter italic"><AlertTriangle size={18}/> Status Global</h4>
                   <div className="space-y-3">
                      <StatusLine label="Lords" value="Ativos" color="text-red-500" />
                      <StatusLine label="Arcas" value="Sincronizadas" color="text-green-500" />
                      <StatusLine label="Recursos" value="Escassos" color="text-yellow-500" />
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LORE */}
        {activeTab === 'lore' && (
          <div className="max-w-4xl mx-auto space-y-20 py-10 animate-in slide-in-from-bottom duration-500">
            <header className="text-center space-y-4">
              <h2 className="text-6xl font-black italic uppercase tracking-tighter drop-shadow-2xl">Crónicas de Nêmesis</h2>
              <div className="w-32 h-2 bg-yellow-500 mx-auto rounded-full"></div>
            </header>
            <div className="space-y-12">
              <LoreChapter num="I" title="A Era da Tensão">Antes da guerra, o mundo era um tabuleiro. Equilíbrio sustentado pela espionagem e pelo Arkanis.</LoreChapter>
              <LoreChapter num="II" title="O Erro Fatal">O colapso veio da arrogância dimensional. Portais foram abertos para criaturas desconhecidas.</LoreChapter>
              <LoreChapter num="V" title="O Mundo Novo">Os monstros tornaram-se Lords. Os humanos tornaram-se lendas. Os Villagers herdaram as ruínas.</LoreChapter>
              <LoreChapter num="VIII" title="O Despertar">Os escolhidos despertaram. O objetivo é claro: retomar o mundo e governar o futuro.</LoreChapter>
            </div>
          </div>
        )}

        {/* TIMES */}
        {activeTab === 'teams' && (
          <div className="space-y-32 animate-in zoom-in duration-500 py-10">
            <TeamGrid color="#bc13fe" name="Andromeda" players={andromeda} motto="Disciplina para a Restauração" />
            <TeamGrid color="#22c55e" name="Helix" players={helix} motto="Adaptação para a Sobrevivência" reverse />
          </div>
        )}

        {/* ADMIN */}
        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto py-10 animate-in fade-in duration-500">
            {!isAdmin ? (
              <div className="bg-[#0a0a0a] p-16 rounded-[3rem] border border-white/5 text-center relative shadow-2xl max-w-xl mx-auto">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-yellow-500 rounded-3xl flex items-center justify-center shadow-2xl rotate-12">
                  <Lock size={32} className="text-black" />
                </div>
                <h2 className="text-4xl font-black mb-10 mt-8 uppercase tracking-tighter italic">Terminal Arca</h2>
                <div id="login-err" className="hidden mb-6 bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/20 text-xs font-black uppercase">Chave de Acesso Inválida</div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <input type="password" placeholder="INSIRA A CHAVE OPERACIONAL" className="w-full bg-black border-2 border-white/5 p-5 rounded-2xl focus:border-yellow-500 outline-none text-center font-black tracking-widest transition-all" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
                  <button className="w-full bg-yellow-500 text-black font-black p-5 rounded-2xl hover:bg-yellow-400 transition-all shadow-xl active:scale-95 text-lg uppercase">Sincronizar Terminal</button>
                </form>
              </div>
            ) : (
              <div className="space-y-10">
                <header className="flex justify-between items-center bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                  <div className="flex items-center gap-6">
                    <img src={String(siteSettings.logoUrl)} className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
                    <div>
                      <h3 className="font-black text-xl uppercase italic leading-none mb-2">Painel Ativo</h3>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full animate-pulse ${adminRole === 'master' ? 'bg-yellow-500' : 'bg-blue-500'}`}></span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${adminRole === 'master' ? 'text-yellow-500' : 'text-blue-500'}`}>
                          Nível: {adminRole === 'master' ? 'Comandante Master' : 'Operador Logístico'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {adminRole === 'master' && (
                      <button onClick={() => setShowSettings(!showSettings)} className={`p-4 rounded-2xl transition-all ${showSettings ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-white'}`}><Settings size={22}/></button>
                    )}
                    <button onClick={() => { setIsAdmin(false); setAdminRole(null); }} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><LogOut size={22}/></button>
                  </div>
                </header>

                {/* Painel Master */}
                {showSettings && adminRole === 'master' && (
                  <div className="grid md:grid-cols-2 gap-8 animate-in zoom-in duration-300">
                    <div className="bg-yellow-500/5 border border-yellow-500/20 p-10 rounded-[2.5rem] space-y-6 shadow-xl">
                      <h4 className="font-black uppercase text-yellow-500 flex items-center gap-3 text-lg italic"><Palette size={22}/> Identidade Global</h4>
                      <div className="flex items-center gap-6">
                         <img src={String(siteSettings.logoUrl)} className="w-24 h-24 rounded-3xl object-cover border-2 border-yellow-500/50" />
                         <button disabled={isUploading} onClick={() => logoInputRef.current?.click()} className="flex-1 p-4 bg-yellow-500 text-black font-black rounded-2xl hover:bg-yellow-400 transition-all text-xs uppercase shadow-xl">
                           Mudar Logo
                         </button>
                         <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpdate} />
                      </div>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/20 p-10 rounded-[2.5rem] space-y-6 shadow-xl">
                      <h4 className="font-black uppercase text-blue-400 flex items-center gap-3 text-lg italic"><Settings size={22}/> Configurar Host</h4>
                      <div className="space-y-4">
                         <input type="password" placeholder="GitHub Token" className="w-full bg-black border border-white/5 p-4 rounded-xl text-sm font-bold focus:border-blue-500 outline-none" value={String(ghConfig.token || '')} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} />
                         <div className="grid grid-cols-2 gap-4">
                           <input type="text" placeholder="Dono" className="bg-black border border-white/5 p-4 rounded-xl text-sm font-bold" value={String(ghConfig.owner || '')} onChange={e => setGhConfig({...ghConfig, owner: e.target.value})} />
                           <input type="text" placeholder="Repo" className="bg-black border border-white/5 p-4 rounded-xl text-sm font-bold" value={String(ghConfig.repo || '')} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} />
                         </div>
                         <button onClick={saveGhConfig} className="w-full bg-blue-600 text-white font-black p-4 rounded-xl hover:bg-blue-500 transition-all uppercase text-xs">Salvar Credenciais</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nova Postagem */}
                <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
                  <h3 className="font-black text-2xl mb-6 flex items-center gap-3 uppercase italic tracking-tighter">
                    <Plus size={28} className="text-yellow-500"/> Nova Transmissão Global
                  </h3>
                  <div className="grid lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <div 
                         onClick={() => !isUploading && fileInputRef.current?.click()}
                         className={`w-full aspect-video border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all bg-black group overflow-hidden ${newPost.mediaUrl ? 'border-yellow-500/40' : 'border-white/5 hover:border-yellow-500/40'}`}
                       >
                         {isUploading ? (
                           <div className="text-center">
                             <Loader2 className="animate-spin text-yellow-500 mx-auto mb-4" size={32} />
                             <p className="text-[10px] font-black uppercase text-yellow-500 tracking-widest">{uploadProgress || 'SINCRONIZANDO...'}</p>
                           </div>
                         ) : newPost.mediaUrl ? (
                           <div className="relative w-full h-full group">
                             {newPost.mediaType === 'video' ? <div className="h-full w-full flex items-center justify-center bg-neutral-900"><Film size={48} className="text-yellow-500"/></div> : <img src={String(newPost.mediaUrl)} className="w-full h-full object-cover" />}
                             <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                <span className="font-black uppercase text-xs tracking-widest">Trocar Ficheiro</span>
                             </div>
                           </div>
                         ) : (
                           <div className="text-center space-y-4">
                             <div className="flex justify-center gap-4 text-gray-700 group-hover:text-yellow-500 transition-colors">
                               <Camera size={40} /><Film size={40} />
                             </div>
                             <p className="text-[10px] font-black uppercase text-gray-600">Inserir Mídia p/ Mural</p>
                           </div>
                         )}
                       </div>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                    </div>
                    <form onSubmit={createPost} className="flex flex-col gap-4">
                       <input type="text" placeholder="TÍTULO DA MISSÃO" className="w-full bg-black border border-white/5 p-5 rounded-2xl focus:border-yellow-500 outline-none font-black uppercase text-sm" value={newPost.title} onChange={(e) => setNewPost({...newPost, title: e.target.value})} />
                       <textarea placeholder="RELATÓRIO DE CAMPO..." className="w-full bg-black border border-white/5 p-6 rounded-3xl focus:border-yellow-500 outline-none h-48 font-medium text-base resize-none shadow-inner" value={newPost.content} onChange={(e) => setNewPost({...newPost, content: e.target.value})}></textarea>
                       <button disabled={isUploading} className={`w-full font-black p-6 rounded-[2rem] transition-all shadow-2xl active:scale-95 text-lg uppercase ${isUploading ? 'bg-gray-800 text-gray-500' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}>
                         {isUploading ? 'AGUARDE...' : 'Disparar Transmissão'}
                       </button>
                    </form>
                  </div>
                </div>

                {/* Mural Histórico */}
                <div className="space-y-6">
                   <h3 className="font-black text-2xl flex items-center gap-3 px-4 uppercase italic">Histórico de Registros</h3>
                   <div className="grid gap-4">
                     {posts.map(p => (
                       <div key={p.id} className="flex items-center justify-between bg-[#0a0a0a] p-6 rounded-[2rem] border border-white/5 group hover:border-white/10 transition-all">
                         <div className="flex items-center gap-6 overflow-hidden">
                            <img src={String(p.mediaUrl || siteSettings.logoUrl)} className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                            <div className="truncate">
                               <h4 className="font-black text-white uppercase text-lg truncate leading-tight">{String(p.title || '')}</h4>
                               <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-1">Autor: {p.author}</p>
                            </div>
                         </div>
                         {adminRole === 'master' && (
                           <button onClick={() => deletePost(p.id)} className="p-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-lg active:scale-90"><Trash2 size={24}/></button>
                         )}
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-white/5 py-20 text-center opacity-30">
        <div className="flex flex-col items-center gap-6">
           <img src={String(siteSettings.logoUrl)} className="w-16 h-16 grayscale" />
           <p className="text-[10px] font-black tracking-[0.6em] uppercase italic">{String(siteSettings.siteName)} • MMXXVI</p>
        </div>
      </footer>
    </div>
  );
}

// Subcomponentes
function NavBtn({ active, onClick, Icon, label }) {
  return (
    <button onClick={onClick} className={`hidden md:flex items-center gap-3 px-6 py-2 rounded-xl font-black uppercase text-[11px] tracking-[0.2em] transition-all ${active ? 'bg-yellow-500/10 text-yellow-500 shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
      {Icon && <Icon size={18}/>} {label}
    </button>
  );
}

function LoreChapter({ num, title, children }) {
  return (
    <section className="group bg-white/[0.01] p-10 rounded-[3rem] border border-transparent hover:border-white/5 transition-all">
      <div className="flex items-center gap-8 mb-8 transition-transform group-hover:translate-x-2 duration-500">
        <span className="text-7xl font-black text-white/[0.03] select-none leading-none italic">{num}</span>
        <h3 className="text-4xl font-black text-yellow-500 uppercase italic tracking-tighter leading-none">{title}</h3>
      </div>
      <div className="pl-12 text-gray-400 leading-[2.2] text-xl border-l-4 border-white/5 font-medium text-justify group-hover:border-yellow-500/30 transition-colors">
        {children}
      </div>
    </section>
  );
}

function TeamGrid({ color, name, players, motto, reverse }) {
  return (
    <div className={`flex flex-col ${reverse ? 'items-end text-right' : 'items-start'} space-y-12`}>
      <div className="space-y-2">
         <div className="h-2 w-24 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }}></div>
         <h2 className="text-7xl font-black italic uppercase tracking-tighter" style={{color: color}}>{name}</h2>
         <p className="text-gray-500 text-sm font-black uppercase tracking-[0.5em]">{motto}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
        {players.map(p => (
          <div key={p} className={`bg-[#0a0a0a] p-6 font-black text-2xl italic shadow-2xl border-b-4 hover:-translate-y-2 transition-all group`} style={{borderBottomColor: color}}>
            <span className="text-white/10 group-hover:text-white transition-colors mr-3 uppercase">#</span> {p}
          </div>
        ))}
      </div>
    </div>
  );
}

function SideCard({ color, name, desc }) {
  return (
    <div className="bg-[#0a0a0a] p-8 rounded-[2rem] border border-white/5 shadow-2xl group hover:border-white/10 transition-all">
       <h4 className="font-black text-2xl mb-2 italic tracking-tighter uppercase" style={{color}}>{name}</h4>
       <p className="text-sm text-gray-400 leading-relaxed font-medium">{desc}</p>
       <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full w-[40%] group-hover:w-full transition-all duration-1000" style={{backgroundColor: color}}></div>
       </div>
    </div>
  );
}

function StatusLine({ label, value, color }) {
  return (
    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-2">
       <span className="text-gray-600">{label}</span>
       <span className={color}>{value}</span>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { 
  Send, 
  Copy, 
  User, 
  Users, 
  Settings, 
  Check, 
  ShieldCheck, 
  MessageSquare,
  Terminal,
  Wifi
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  sender: 'me' | 'them';
  text: string;
  timestamp: number;
}

interface PeerInfo {
  id: string;
  name: string;
  lastMessage?: string;
  lastActive?: number;
}

const App: React.FC = () => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [connectedPeerId, setConnectedPeerId] = useState<string>('');
  const [activeConnection, setActiveConnection] = useState<DataConnection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [status, setStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [copied, setCopied] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Peer
  useEffect(() => {
    const newPeer = new Peer();
    
    newPeer.on('open', (id) => {
      setMyId(id);
      setPeer(newPeer);
      setStatus('online');
      console.log('My peer ID is: ' + id);
    });

    newPeer.on('connection', (conn) => {
      conn.on('data', (data: any) => {
        if (data.type === 'chat') {
          addMessage('them', data.text);
        }
      });
      
      conn.on('open', () => {
        setActiveConnection(conn);
        setConnectedPeerId(conn.peer);
        updatePeerList(conn.peer);
      });
    });

    newPeer.on('error', (err) => {
      console.error(err);
      setStatus('offline');
    });

    return () => {
      newPeer.destroy();
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load chat history for the active peer
  useEffect(() => {
    if (connectedPeerId) {
      const saved = localStorage.getItem(`chat_${connectedPeerId}`);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([]);
      }
    }
  }, [connectedPeerId]);

  // Save chat history
  useEffect(() => {
    if (connectedPeerId && messages.length > 0) {
      localStorage.setItem(`chat_${connectedPeerId}`, JSON.stringify(messages));
    }
  }, [messages, connectedPeerId]);

  const connectToPeer = (targetId: string) => {
    if (!peer || !targetId) return;
    
    setStatus('connecting');
    const conn = peer.connect(targetId);
    
    conn.on('open', () => {
      setActiveConnection(conn);
      setConnectedPeerId(targetId);
      setStatus('online');
      updatePeerList(targetId);
    });

    conn.on('data', (data: any) => {
      if (data.type === 'chat') {
        addMessage('them', data.text);
      }
    });

    conn.on('error', (err) => {
      console.error(err);
      setStatus('online');
    });
  };

  const updatePeerList = (id: string) => {
    setPeers(prev => {
      if (prev.find(p => p.id === id)) return prev;
      return [...prev, { id, name: `User ${id.substring(0, 4)}` }];
    });
  };

  const addMessage = (sender: 'me' | 'them', text: string) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      sender,
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConnection) return;

    activeConnection.send({
      type: 'chat',
      text: inputText,
    });

    addMessage('me', inputText);
    setInputText('');
  };

  const copyId = () => {
    navigator.clipboard.writeText(myId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className={cn(
        "bg-[#111111] border-r border-white/5 flex flex-col transition-all duration-300 overflow-hidden",
        isSidebarOpen ? "w-80" : "w-0"
      )}>
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              PC Messenger
            </h1>
            <div className={cn(
              "w-2 h-2 rounded-full",
              status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : 
              status === 'connecting' ? "bg-amber-500 animate-pulse" : "bg-red-500"
            )} />
          </div>

          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 block">
                Your Personal Address
              </label>
              <div className="flex items-center gap-2 group">
                <code className="flex-1 text-xs text-indigo-300 font-mono truncate bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                  {myId || 'Generating...'}
                </code>
                <button 
                  onClick={copyId}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                  title="Copy ID"
                >
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
              <label className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold mb-2 block">
                Connect to Peer
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Paste Friend's ID..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      connectToPeer(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
          <div className="px-4 mb-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Recent Chats</span>
          </div>
          {peers.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MessageSquare className="mx-auto text-zinc-700 mb-2" size={24} />
              <p className="text-xs text-zinc-500">No active chats. Share your ID to start messaging.</p>
            </div>
          ) : (
            peers.map((p) => (
              <button
                key={p.id}
                onClick={() => setConnectedPeerId(p.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group mb-1",
                  connectedPeerId === p.id ? "bg-indigo-600/20 border border-indigo-500/30" : "hover:bg-white/5 border border-transparent"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono truncate">{p.id}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <User size={14} className="text-zinc-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">PC Host Instance</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-[10px] text-zinc-500">Online</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {!connectedPeerId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
              <div className="relative bg-[#111] border border-white/5 p-6 rounded-3xl shadow-2xl">
                <ShieldCheck size={48} className="text-indigo-400 mx-auto" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to your Private Messenger</h2>
            <p className="text-zinc-400 max-w-md mx-auto text-sm leading-relaxed">
              This application works over a direct Peer-to-Peer connection. 
              No messages are stored on any server. 
              <span className="block mt-2 font-semibold text-indigo-400">
                It only works when your PC (this browser tab) is active.
              </span>
            </p>
            
            <div className="mt-10 grid grid-cols-3 gap-4 w-full max-w-2xl">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
                <Wifi className="mb-2 text-indigo-400" size={20} />
                <p className="text-[10px] font-bold uppercase tracking-tighter">Direct P2P</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
                <ShieldCheck className="mb-2 text-emerald-400" size={20} />
                <p className="text-[10px] font-bold uppercase tracking-tighter">Encrypted</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
                <Terminal className="mb-2 text-purple-400" size={20} />
                <p className="text-[10px] font-bold uppercase tracking-tighter">Ephemeral</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 -ml-2 hover:bg-white/5 rounded-lg lg:hidden"
                >
                  <Users size={18} />
                </button>
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
                  {connectedPeerId.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">User {connectedPeerId.substring(0, 8)}</h3>
                  <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Secure Connection Active
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/5 rounded-full text-zinc-400 transition-colors">
                  <Settings size={18} />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
            >
              <AnimatePresence initial={false}>
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                    <MessageSquare size={40} className="mb-2" />
                    <p className="text-sm">Say hello! Encryption is active.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        msg.sender === 'me' ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                        msg.sender === 'me' 
                          ? "bg-indigo-600 text-white rounded-tr-none" 
                          : "bg-zinc-800 text-zinc-100 rounded-tl-none"
                      )}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1.5 font-medium">
                        {format(msg.timestamp, 'HH:mm')}
                      </span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-white/5 bg-[#0a0a0a]">
              <form 
                onSubmit={handleSendMessage}
                className="relative flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={activeConnection ? "Write a message..." : "Waiting for peer..."}
                    disabled={!activeConnection}
                    className="w-full bg-[#111] border border-white/10 rounded-2xl pl-5 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-zinc-600"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {!activeConnection && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-amber-500 uppercase">Offline</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!inputText.trim() || !activeConnection}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                    inputText.trim() && activeConnection
                      ? "bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] text-white scale-100"
                      : "bg-zinc-800 text-zinc-600 scale-95 cursor-not-allowed"
                  )}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        )}
      </main>

      {/* Global CSS for scrollbars and effects */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        @keyframes subtle-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        
        body {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default App;

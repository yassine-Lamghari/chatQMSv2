"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function AdminInterface() {
  const [activeTab, setActiveTab] = useState("config");
  const [user, setUser] = useState<{username: string, role: string} | null>(null);
  const router = useRouter();

  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newDoc, setNewDoc] = useState<{ file: File | null, doc_type: string, criticality: string, version: string, owner: string, language: string, site: string }>({
    file: null,
    doc_type: 'Procédure',
    criticality: 'Medium',
    version: '1.0',
    owner: 'QMS',
    language: 'fr',
    site: 'default'
  });
  const [llmConfigs, setLlmConfigs] = useState<any[]>([]);
  const [activeProvider, setActiveProvider] = useState("ollama");
  const [savingLlm, setSavingLlm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("ollama");
  const [llmCloudConfig, setLlmCloudConfig] = useState({
    groq: { api_key: "", base_url: "" },
    gemini: { api_key: "", base_url: "" },
    deepseek: { api_key: "", base_url: "" },
  });
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "docs") {
      fetchDocuments();
    } else if (activeTab === "config") {
      fetchLlmConfig();
    }
  }, [activeTab]);

  const fetchLlmConfig = async () => {
    try {
      const [configsRes, activeRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/config`),
        fetch(`${API_BASE_URL}/api/config/active`),
      ]);
      if (configsRes.ok) {
        const configs = await configsRes.json();
        setLlmConfigs(configs);
        const nextCloudConfig = {
          groq: { api_key: "", base_url: "" },
          gemini: { api_key: "", base_url: "" },
          deepseek: { api_key: "", base_url: "" },
        };
        for (const cfg of configs) {
          if (cfg.provider === "groq" || cfg.provider === "gemini" || cfg.provider === "deepseek") {
            nextCloudConfig[cfg.provider as "groq" | "gemini" | "deepseek"] = {
              api_key: cfg.api_key || "",
              base_url: cfg.base_url || "",
            };
          }
        }
        setLlmCloudConfig(nextCloudConfig);
      }
      if (activeRes.ok) {
        const active = await activeRes.json();
        if (active?.provider) {
          setActiveProvider(active.provider);
          setSelectedProvider(active.provider);
        }
      }
    } catch (error) {
      console.error("Failed to fetch LLM config", error);
    }
  };

  const handleSaveProviderConfig = async (provider: "groq" | "gemini" | "deepseek") => {
    setSavingProvider(provider);
    try {
      const res = await fetch(`${API_BASE_URL}/api/config/${provider}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(llmCloudConfig[provider]),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `Failed to save ${provider}`);
      }
      alert(`Configuration ${provider} sauvegardée.`);
      fetchLlmConfig();
    } catch (error: any) {
      alert(`Erreur: ${error.message || "Impossible de sauvegarder"}`);
    } finally {
      setSavingProvider(null);
    }
  };

  const handleSetActiveLlm = async () => {
    setSavingLlm(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/config/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeProvider }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to save active provider");
      }
      alert("LLM actif mis à jour.");
    } catch (error: any) {
      alert(`Erreur: ${error.message || "Impossible de sauvegarder"}`);
    } finally {
      setSavingLlm(false);
    }
  };

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Failed to fetch documents", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.file) {
      alert("Veuillez sélectionner un fichier.");
      return;
    }
    
    const formData = new FormData();
    formData.append("file", newDoc.file);
    formData.append("doc_type", newDoc.doc_type);
    formData.append("criticality", newDoc.criticality);
    formData.append("version", newDoc.version);
    formData.append("owner", newDoc.owner);
    formData.append("language", newDoc.language);
    formData.append("site", newDoc.site);

    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setNewDoc({ file: null, doc_type: 'Procédure', criticality: 'Medium', version: '1.0', owner: 'QMS', language: 'fr', site: 'default' });
        setShowUploadForm(false);
        fetchDocuments();
      } else {
        const errorData = await res.json();
        alert(`Erreur: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Failed to upload document", error);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm("Voulez-vous vraiment supprimer ce document ?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${docId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchDocuments();
      } else {
        const errorData = await res.json();
        alert(`Erreur: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Failed to delete document", error);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`);
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setNewUser({ username: '', password: '', role: 'user' });
        fetchUsers();
      } else {
        const errorData = await res.json();
        alert(`Erreur: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Failed to create user", error);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchUsers();
      } else {
         const errorData = await res.json();
         alert(`Erreur: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
    } else {
      const parsedUser = JSON.parse(stored);
      if (parsedUser.role !== "admin") {
        router.push("/");
      } else {
        setUser(parsedUser);
      }
    }
  }, [router]);

  if (!user) return <div className="h-screen w-full bg-[#0f172a] flex items-center justify-center text-slate-400">Chargement...</div>;

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-200 font-sans">
      {/* Sidebar Admin */}
      <div className="w-64 bg-[#1e293b] border-r border-slate-700 p-4 flex flex-col">
        <h2 className="text-xl font-bold gemini-gradient flex items-center gap-2 mb-8">
          <span>✧</span> QMS Admin
        </h2>
        
        <div className="flex flex-col space-y-2">
          <button 
            onClick={() => setActiveTab("config")}
            className={`text-left px-4 py-2 rounded-lg transition ${activeTab === "config" ? "bg-blue-600/20 text-blue-400" : "hover:bg-slate-700 text-slate-300"}`}
          >
            Configuration LLM
          </button>
          <button 
            onClick={() => setActiveTab("docs")}
            className={`text-left px-4 py-2 rounded-lg transition ${activeTab === "docs" ? "bg-blue-600/20 text-blue-400" : "hover:bg-slate-700 text-slate-300"}`}
          >
            Gestion des Documents (RAG)
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={`text-left px-4 py-2 rounded-lg transition ${activeTab === "users" ? "bg-blue-600/20 text-blue-400" : "hover:bg-slate-700 text-slate-300"}`}
          >
            Utilisateurs
          </button>
        </div>

        <div className="mt-auto border-t border-slate-700 pt-4">
          <button 
            onClick={() => { localStorage.removeItem("user"); router.push("/login"); }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg cursor-pointer flex items-center space-x-2 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Admin Area */}
      <div className="flex-1 flex flex-col overflow-y-auto p-8">
        <h1 className="text-3xl font-bold mb-8 text-slate-100">Panneau d'Administration</h1>

        {activeTab === "config" && (
          <div className="max-w-2xl bg-[#1e293b] border border-slate-700 rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-6">Configuration des Modèles LLM</h3>
            
            <div className="space-y-6">

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Choix du modèle</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    setActiveProvider(e.target.value);
                  }}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="gemini">Gemini</option>
                  <option value="groq">Groq</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="ollama">Ollama</option>
                </select>
                <p className="text-xs text-slate-400">
                  Le chatbot utilisera ce modèle comme LLM principal.
                </p>
              </div>

              {selectedProvider !== "ollama" && (
                <div className="space-y-2 border border-slate-700 rounded-xl p-4">
                  <h4 className="font-medium text-slate-200">
                    Configuration API {selectedProvider === "gemini" ? "Gemini" : selectedProvider === "groq" ? "Groq" : "DeepSeek"}
                  </h4>
                  <input
                    type="password"
                    value={llmCloudConfig[selectedProvider as "groq" | "gemini" | "deepseek"].api_key}
                    onChange={(e) =>
                      setLlmCloudConfig((prev) => ({
                        ...prev,
                        [selectedProvider]: {
                          ...prev[selectedProvider as "groq" | "gemini" | "deepseek"],
                          api_key: e.target.value,
                        },
                      }))
                    }
                    placeholder="Clé API (ex: sk-... / AIza... / gsk_...)"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={llmCloudConfig[selectedProvider as "groq" | "gemini" | "deepseek"].base_url}
                    onChange={(e) =>
                      setLlmCloudConfig((prev) => ({
                        ...prev,
                        [selectedProvider]: {
                          ...prev[selectedProvider as "groq" | "gemini" | "deepseek"],
                          base_url: e.target.value,
                        },
                      }))
                    }
                    placeholder="URL API (optionnel, OpenAI-compatible)"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleSaveProviderConfig(selectedProvider as "groq" | "gemini" | "deepseek")}
                    disabled={savingProvider === selectedProvider}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-medium rounded-lg px-4 py-2 transition"
                  >
                    {savingProvider === selectedProvider ? "Sauvegarde API..." : "Sauvegarder API"}
                  </button>
                </div>
              )}

              <button
                onClick={handleSetActiveLlm}
                disabled={savingLlm}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white font-medium rounded-lg px-4 py-2 transition"
              >
                {savingLlm ? "Sauvegarde..." : "Sauvegarder le modèle actif (RAG)"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "docs" && (
          <div className="max-w-4xl bg-[#1e293b] border border-slate-700 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Base Documentaire QMS</h3>
              <button 
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {showUploadForm ? "Annuler" : "Ajouter un document"}
              </button>
            </div>

            {showUploadForm && (
              <div className="mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <h4 className="text-lg font-medium mb-4">Nouveau document</h4>
                <form onSubmit={handleUploadDocument} className="flex flex-col gap-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm text-slate-400">Fichier</label>
                      <input 
                        type="file" 
                        required 
                        onChange={e => setNewDoc({...newDoc, file: e.target.files ? e.target.files[0] : null})} 
                        className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-sm text-slate-400">Type</label>
                      <select 
                        value={newDoc.doc_type} 
                        onChange={e => setNewDoc({...newDoc, doc_type: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-slate-200"
                      >
                        <option value="Procédure">Procédure</option>
                        <option value="Modèle">Modèle</option>
                        <option value="Politique">Politique</option>
                        <option value="Manuel">Manuel</option>
                      </select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-sm text-slate-400">Criticité</label>
                      <select 
                        value={newDoc.criticality} 
                        onChange={e => setNewDoc({...newDoc, criticality: e.target.value})} 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-slate-200"
                      >
                        <option value="Low">Faible (Low)</option>
                        <option value="Medium">Moyenne (Medium)</option>
                        <option value="High">Haute (High)</option>
                        <option value="Critical">Critique (Critical)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm text-slate-400">Version</label>
                      <input
                        value={newDoc.version}
                        onChange={e => setNewDoc({...newDoc, version: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-slate-200"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-sm text-slate-400">Owner</label>
                      <input
                        value={newDoc.owner}
                        onChange={e => setNewDoc({...newDoc, owner: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-slate-200"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-sm text-slate-400">Langue</label>
                      <select
                        value={newDoc.language}
                        onChange={e => setNewDoc({...newDoc, language: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-slate-200"
                      >
                        <option value="fr">FR</option>
                        <option value="en">EN</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Site / usine</label>
                    <input
                      type="text"
                      value={newDoc.site}
                      onChange={e => setNewDoc({ ...newDoc, site: e.target.value })}
                      placeholder="ex: Site-Paris, Plant-01"
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-slate-200"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-6 py-2 transition">
                      Uploader
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            <div className="overflow-x-auto">
              {loadingDocs ? (
                <div className="p-4 text-center text-slate-400">Chargement des documents...</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/50 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Nom du Fichier</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Criticité</th>
                      <th className="px-4 py-3 rounded-tr-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-200 font-medium">{doc.filename}</td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-700 px-2 py-1 rounded text-xs">{doc.doc_type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={
                            doc.criticality === "High" || doc.criticality === "Critical" ? "text-red-400" :
                            doc.criticality === "Medium" ? "text-yellow-400" : "text-green-400"
                          }>
                            {doc.criticality}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-400 hover:text-red-300 transition">
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                    {documents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucun document trouvé.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="max-w-4xl bg-[#1e293b] border border-slate-700 rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-6">Gestion des Utilisateurs</h3>
            <p className="text-slate-400 text-sm mb-4">Ajoutez, modifiez ou supprimez les accès au chatbot.</p>
            <div className="mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <h4 className="text-lg font-medium mb-4">Ajouter un utilisateur</h4>
              <form onSubmit={handleCreateUser} className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm text-slate-400">Nom d'utilisateur</label>
                  <input type="text" required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm text-slate-400">Mot de passe</label>
                  <input type="password" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm text-slate-400">Rôle</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-slate-200">
                    <option value="user">Utilisateur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-6 py-2 transition h-[42px]">
                  Ajouter
                </button>
              </form>
            </div>

            <div className="overflow-x-auto">
              {loadingUsers ? (
                <div className="p-4 text-center text-slate-400">Chargement des utilisateurs...</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/50 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">ID</th>
                      <th className="px-4 py-3">Nom d'utilisateur</th>
                      <th className="px-4 py-3">Rôle</th>
                      <th className="px-4 py-3 rounded-tr-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3">{u.id}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{u.username}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-300'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.username !== 'admin' && (
                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-300 transition">
                              Supprimer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {usersList.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucun utilisateur trouvé.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

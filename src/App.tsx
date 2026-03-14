import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  FileText,
  Trash2,
  ArrowLeft,
  Save,
  Download,
  Printer,
  Info,
  ShieldAlert,
  LayoutDashboard,
  PlusCircle,
  MinusCircle,
  ImagePlus,
  Filter,
  Loader2,
  Briefcase,
  Wifi,
  Database,
  Users,
  Paperclip,
  Link,
  X,
  Eye,
} from "lucide-react";

import {
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import { setDoc, deleteDoc, onSnapshot, getDoc } from "firebase/firestore";

import {
  auth,
  projectsRef,
  wmsDocumentsRef,
  jsaDocumentsRef,
  usersRef,
  projectDoc,
  wmsDoc,
  jsaDoc,
  metaDoc,
} from "./firebase";
import { getDocs } from "firebase/firestore";
import { seedMockDataToFirestore } from "./seedData";
import { api, useApiForSave } from "./api";
import { useAuth } from "./contexts/AuthContext";
import type { UserProfile } from "./types/auth";

// --- Helper Function: Export to MS Word ---
const exportToWord = (
  elementId: string,
  filename: string = "Document.doc",
  isLandscape: boolean = false
) => {
  const landscapeCSS = isLandscape
    ? `@page { size: landscape; margin: 2cm; }`
    : `@page { size: portrait; margin: 2cm; }`;
  const preHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Export HTML To Doc</title>
      <style>
        ${landscapeCSS}
        body { font-family: 'Sarabun', 'Cordia New', sans-serif; font-size: 14pt; }
        h1, h2, h3 { font-family: 'Sarabun', 'Cordia New', sans-serif; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        table, th, td { border: 1px solid black; }
        th, td { padding: 8px; text-align: left; }
        .section-title { font-weight: bold; font-size: 16pt; text-transform: uppercase; margin-top: 20px; background-color: #f0f0f0; padding: 5px; }
        .sub-section { font-weight: bold; margin-top: 10px; margin-left: 15px; }
        .content { margin-left: 15px; margin-bottom: 10px; white-space: pre-wrap; }
        .content img { max-width: 100%; height: auto; border-radius: 8px; margin-top: 10px; margin-bottom: 10px; border: 1px solid #ddd; display: block; }
        /* JSA Specific Styles */
        .jsa-header { background-color: #fae6d1; padding: 15px; margin-bottom: 10px; }
        .jsa-row { background-color: #e6f2e6; }
        .dotted-border td { border-bottom: 1px dotted black; }
      </style>
    </head>
    <body>
  `;
  const postHtml = "</body></html>";
  const element = document.getElementById(elementId);
  if (!element) return;

  const html = preHtml + element.innerHTML + postHtml;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url =
    "data:application/vnd.ms-word;charset=utf-8," + encodeURIComponent(html);

  const downloadLink = document.createElement("a");
  document.body.appendChild(downloadLink);
  if ((navigator as any).msSaveOrOpenBlob) {
    (navigator as any).msSaveOrOpenBlob(blob, filename);
  } else {
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.click();
  }
  document.body.removeChild(downloadLink);
};

// --- CMG Logo Component ---
const CMGLogo = ({ className = "" }) => (
  <div
    className={`border-2 border-red-600 bg-white flex flex-col items-center justify-center py-1 px-2 ${className}`}
    style={{ minWidth: "180px", maxWidth: "220px" }}
  >
    <div
      className="text-red-600 font-black leading-none"
      style={{
        fontFamily: "Arial, sans-serif",
        fontSize: "36px",
        letterSpacing: "1px",
      }}
    >
      CMG
    </div>
    <div
      className="text-blue-700 font-bold mt-1"
      style={{
        fontSize: "9px",
        fontFamily: "Arial, sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      Engineering & Construction Co.,Ltd.
    </div>
  </div>
);

// --- Custom Rich Text Editor with Image Paste Support ---
const RichTextEditor = ({ name, value, onChange, placeholder }: { name: string; value: string; onChange: any; placeholder?: string }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (onChange && editorRef.current) {
      onChange({ target: { name, value: editorRef.current.innerHTML } });
    }
  };

  const processAndInsertImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const imgTag = `<br/><img src="${dataUrl}" style="max-width: 100%; border-radius: 8px; margin: 10px 0; border: 1px solid #ddd;" alt="Pasted Document Image" /><br/>`;

        if (editorRef.current) {
          editorRef.current.focus();
          document.execCommand("insertHTML", false, imgTag);
          handleInput();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) processAndInsertImage(file);
        break;
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAndInsertImage(file);
    e.target.value = "";
  };

  return (
    <div className="relative mb-4 mt-2">
      <div className="absolute -top-7 right-0">
        <label className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs flex items-center bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors shadow-sm border border-blue-100 font-medium z-10">
          <ImagePlus size={14} className="mr-1" /> แทรกรูป/Snap (Paste ได้)
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors min-h-[120px] bg-white cursor-text overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner"
      />
    </div>
  );
};

// --- Initial States ---
const initialProjectFormState = {
  id: "",
  projectNo: "",
  projectName: "",
  location: "",
  projectManager: "",
  constructionManager: "",
  projectStart: "",
  projectFinish: "",
  mainContractor: "",
  subContractor: "",
  clientName: "",
  projectNote: "",
};

const initialWMSFormState = {
  id: "",
  project: "",
  documentTitle: "",
  rev: "00",
  issueDate: new Date().toISOString().split("T")[0],
  description: "Initial Issue",
  preparedBy: "",
  reviewedBy: "",
  approvedBy: "",
  scope: "",
  definition: "",
  reference: "",
  equipment: "",
  personnel: "",
  orgChart: "",
  responsibility: "",
  preparation: "",
  procedure: "",
  finishWork: "",
  inspectTesting: "",
  jsa: "",
  documentedInfo: "",
  attachments: [] as { type: "document" | "photo" | "url"; name: string; data: string; url?: string }[],
};

const initialJSAFormState = {
  id: "",
  client: "",
  project: "",
  jobTitle: "",
  preparedBy: "",
  reviewedBy: "",
  approvedBy: "",
  date: new Date().toISOString().split("T")[0],
  rev: "00",
  items: [{ id: Date.now(), step: "", hazard: "", control: "", responder: "" }],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"project" | "wms" | "jsa" | "users">("project");
  const [view, setView] = useState("list"); // 'list', 'form', 'detail'

  const { userProfile } = useAuth();
  const roleList = userProfile?.role;
  const roles = Array.isArray(roleList) ? roleList : [];
  const canManageUsers = roles.includes("SuperAdmin") || roles.includes("Admin");

  // Auth & UI State
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("All"); // ตัวกรองโครงการ
  const [adminUsers, setAdminUsers] = useState<(UserProfile & { id: string })[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);

  // Project State
  const [projects, setProjects] = useState<any[]>([]);
  const [projectFormData, setProjectFormData] = useState<any>(
    initialProjectFormState
  );

  // WMS State
  const [wmsDocuments, setWmsDocuments] = useState<any[]>([]);
  const [wmsFormData, setWmsFormData] = useState<any>(initialWMSFormState);
  const [currentWMSDoc, setCurrentWMSDoc] = useState<any>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // JSA State
  const [jsaDocuments, setJsaDocuments] = useState<any[]>([]);
  const [jsaFormData, setJsaFormData] = useState<any>(initialJSAFormState);
  const [currentJSADoc, setCurrentJSADoc] = useState<any>(null);

  // --- 1. Firebase Auth: ถ้ามี user (จาก Login/Google) อยู่แล้ว ไม่ต้อง anonymous ---
  useEffect(() => {
    let cancelled = false;
    const initAuth = async () => {
      try {
        if (!auth.currentUser) await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Init Error:", error);
        if (!cancelled) setLoadingAuth(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!cancelled) {
        setUser(u);
        setLoadingAuth(false);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // --- 1.1 Seed ข้อมูล Mock ครั้งแรก (เมื่อยังไม่มีใน Firebase) ---
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const metaSnap = await getDoc(metaDoc());
        if (cancelled) return;
        if (!metaSnap.exists() || !metaSnap.data()?.seeded) {
          await seedMockDataToFirestore();
        }
      } catch (e) {
        console.error("Seed check/run error:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // --- โหลดรายชื่อผู้ใช้ (สำหรับ SuperAdmin/Admin) ---
  useEffect(() => {
    if (!canManageUsers) return;
    setAdminUsersLoading(true);
    getDocs(usersRef())
      .then((snap) => {
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as UserProfile & { id: string }));
        setAdminUsers(list);
      })
      .catch(() => setAdminUsers([]))
      .finally(() => setAdminUsersLoading(false));
  }, [canManageUsers]);

  // --- 2. Firestore Real-time Sync ---
  useEffect(() => {
    if (!user) return;

    // Sync Projects (JSA Work Method > root > projects)
    const unsubProj = onSnapshot(
      projectsRef(),
      (snapshot) => {
        const docs: any[] = [];
        snapshot.forEach((d) => docs.push(d.data()));
        setProjects(
          docs.sort((a, b) =>
            (b.updatedAt || "").localeCompare(a.updatedAt || "")
          )
        );
      },
      (err) => console.error("Project Sync Error:", err)
    );

    // Sync WMS (JSA Work Method > root > wms_documents)
    const unsubWms = onSnapshot(
      wmsDocumentsRef(),
      (snapshot) => {
        const docs: any[] = [];
        snapshot.forEach((d) => docs.push(d.data()));
        setWmsDocuments(
          docs.sort((a, b) =>
            (b.updatedAt || "").localeCompare(a.updatedAt || "")
          )
        );
      },
      (err) => console.error("WMS Sync Error:", err)
    );

    // Sync JSA (JSA Work Method > root > jsa_documents)
    const unsubJsa = onSnapshot(
      jsaDocumentsRef(),
      (snapshot) => {
        const docs: any[] = [];
        snapshot.forEach((d) => docs.push(d.data()));
        setJsaDocuments(
          docs.sort((a, b) =>
            (b.updatedAt || "").localeCompare(a.updatedAt || "")
          )
        );
      },
      (err) => console.error("JSA Sync Error:", err)
    );

    return () => {
      unsubProj();
      unsubWms();
      unsubJsa();
    };
  }, [user]);

  // === Project Handlers ===
  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProjectFormData((prev: Record<string, any>) => ({ ...prev, [name]: value }));
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("รอการยืนยันตัวตนสักครู่...");
    const isNew = !projectFormData.id;
    const docId = isNew ? Date.now().toString() : projectFormData.id;
    const docToSave = {
      ...projectFormData,
      id: docId,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (useApiForSave()) {
        await api.saveProject(docToSave);
      } else {
        await setDoc(projectDoc(docId), docToSave);
      }
      setView("list");
      setProjectFormData(initialProjectFormState);
    } catch (err) {
      console.error("Error saving Project:", err);
      alert("ไม่สามารถบันทึกข้อมูลโครงการได้");
    }
  };

  const deleteProject = async (id: string) => {
    if (confirm("ยืนยันการลบข้อมูลโครงการนี้?")) {
      try {
        if (useApiForSave()) {
          await api.deleteProject(id);
        } else {
          await deleteDoc(projectDoc(id));
        }
      } catch (err) {
        console.error("Error deleting Project:", err);
        alert("ไม่สามารถลบข้อมูลโครงการได้");
      }
    }
  };

  // === WMS Handlers ===
  const handleWMSChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setWmsFormData((prev: Record<string, any>) => ({ ...prev, [name]: value }));
  };

  const handleWMSFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "document" | "photo") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target?.result as string;
        setWmsFormData((prev: Record<string, any>) => ({
          ...prev,
          attachments: [
            ...(prev.attachments || []),
            { type, name: file.name, data },
          ],
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const [wmsUrlInput, setWmsUrlInput] = useState("");
  const [wmsUrlNameInput, setWmsUrlNameInput] = useState("");

  const handleWMSAddUrl = () => {
    const url = wmsUrlInput.trim();
    if (!url) return;
    const name = wmsUrlNameInput.trim() || url;
    setWmsFormData((prev: Record<string, any>) => ({
      ...prev,
      attachments: [
        ...(prev.attachments || []),
        { type: "url", name, data: "", url },
      ],
    }));
    setWmsUrlInput("");
    setWmsUrlNameInput("");
  };

  const handleWMSRemoveAttachment = (index: number) => {
    setWmsFormData((prev: Record<string, any>) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const handleWMSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("รอการยืนยันตัวตนสักครู่...");
    const isNew = !wmsFormData.id;
    const docId = isNew ? Date.now().toString() : wmsFormData.id;
    const docToSave = {
      ...wmsFormData,
      id: docId,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (useApiForSave()) {
        await api.saveWMS(docToSave);
      } else {
        await setDoc(wmsDoc(docId), docToSave);
      }
      setView("list");
      setWmsFormData(initialWMSFormState);
      setSelectedProjectFilter(docToSave.project || "All");
    } catch (err) {
      console.error("Error saving WMS:", err);
      alert("ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  const deleteWMS = async (id: string) => {
    if (confirm("ยืนยันการลบเอกสาร WMS นี้?")) {
      try {
        if (useApiForSave()) {
          await api.deleteWMS(id);
        } else {
          await deleteDoc(wmsDoc(id));
        }
      } catch (err) {
        console.error("Error deleting WMS:", err);
        alert("ไม่สามารถลบเอกสาร WMS ได้");
      }
    }
  };

  // === JSA Handlers ===
  const handleJSAChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setJsaFormData((prev: Record<string, any>) => ({ ...prev, [name]: value }));
  };

  const handleJSAItemChange = (index: number, field: string, value: string) => {
    const newItems = [...jsaFormData.items];
    newItems[index][field] = value;
    setJsaFormData({ ...jsaFormData, items: newItems });
  };

  const addJSAItem = () => {
    setJsaFormData({
      ...jsaFormData,
      items: [
        ...jsaFormData.items,
        { id: Date.now(), step: "", hazard: "", control: "", responder: "" },
      ],
    });
  };

  const removeJSAItem = (index: number) => {
    if (jsaFormData.items.length === 1) return;
    const newItems = jsaFormData.items.filter((_: any, i: number): boolean => i !== index);
    setJsaFormData({ ...jsaFormData, items: newItems });
  };

  const handleJSASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("รอการยืนยันตัวตนสักครู่...");
    const isNew = !jsaFormData.id;
    const docId = isNew ? Date.now().toString() : jsaFormData.id;
    const docToSave = {
      ...jsaFormData,
      id: docId,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (useApiForSave()) {
        await api.saveJSA(docToSave);
      } else {
        await setDoc(jsaDoc(docId), docToSave);
      }
      setView("list");
      setJsaFormData(initialJSAFormState);
      setSelectedProjectFilter(docToSave.project || "All");
    } catch (err) {
      console.error("Error saving JSA:", err);
      alert("ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  const deleteJSA = async (id: string) => {
    if (confirm("ยืนยันการลบเอกสาร JSA นี้?")) {
      try {
        if (useApiForSave()) {
          await api.deleteJSA(id);
        } else {
          await deleteDoc(jsaDoc(id));
        }
      } catch (err) {
        console.error("Error deleting JSA:", err);
        alert("ไม่สามารถลบเอกสาร JSA ได้");
      }
    }
  };

  // --- Filtering Logic (แยกตามโครงการ) ---
  const allProjectNames = Array.from(
    new Set([
      ...projects.map((p) => p.projectName),
      ...wmsDocuments.map((d) => d.project || "ไม่ได้ระบุโครงการ"),
      ...jsaDocuments.map((d) => d.project || "ไม่ได้ระบุโครงการ"),
    ])
  )
    .filter(Boolean)
    .sort();

  const filteredWMS = wmsDocuments.filter(
    (d) =>
      selectedProjectFilter === "All" ||
      (d.project || "ไม่ได้ระบุโครงการ") === selectedProjectFilter
  );
  const filteredJSA = jsaDocuments.filter(
    (d) =>
      selectedProjectFilter === "All" ||
      (d.project || "ไม่ได้ระบุโครงการ") === selectedProjectFilter
  );

  // สำหรับการ Render Table List
  let displayDocuments: any[] = [];
  if (activeTab === "wms") displayDocuments = filteredWMS;
  if (activeTab === "jsa") displayDocuments = filteredJSA;

  // === Render Helpers ===
  const renderInput = (
    label: string,
    name: string,
    value: any,
    onChange: any,
    hint: string = "",
    type: string = "text",
    required: boolean = false,
    options: string[] = []
  ) => (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <label className="block text-sm font-semibold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      </div>
      {type === "textarea" ? (
        <RichTextEditor
          name={name}
          value={value}
          onChange={onChange}
          placeholder="พิมพ์ข้อความ... หรือใช้คำสั่ง Ctrl+V / Cmd+V เพื่อวางรูปภาพในนี้ได้เลย"
        />
      ) : type === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
        >
          <option value="">-- เลือกโครงการ --</option>
          {options.map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          placeholder="กรอกข้อมูล..."
        />
      )}
      {hint && type !== "textarea" && (
        <p className="mt-1 text-xs text-gray-500 flex items-center">
          <Info className="w-3 h-3 mr-1" /> {hint}
        </p>
      )}
    </div>
  );

  // --- Loading View ---
  if (loadingAuth) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700">
          กำลังเชื่อมต่อฐานข้อมูล...
        </h2>
      </div>
    );
  }

  // --- Project Form (inline เพื่อไม่ให้เคอร์เซอร์เด้งออกตอนพิมพ์) ---
  const projectFormJSX = view === "form" && activeTab === "project" && (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
      <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center text-white">
          <button
            onClick={() => setView("list")}
            className="mr-4 hover:bg-emerald-700 p-2 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">
            ข้อมูลโครงการ (Project Information)
          </h1>
        </div>
      </div>
      <form onSubmit={handleProjectSubmit} className="p-6 md:p-8 space-y-6">
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 mb-4">
          <h3 className="font-semibold text-emerald-800 mb-4 border-b border-emerald-200 pb-2">
            A1 ข้อมูลโครงการ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput(
              "Project No.",
              "projectNo",
              projectFormData.projectNo,
              handleProjectChange,
              "",
              "text",
              true
            )}
            {renderInput(
              "Project Name",
              "projectName",
              projectFormData.projectName,
              handleProjectChange,
              "",
              "text",
              true
            )}
            <div className="md:col-span-2">
              {renderInput(
                "Location",
                "location",
                projectFormData.location,
                handleProjectChange
              )}
            </div>
            {renderInput(
              "Project Manager (PM)",
              "projectManager",
              projectFormData.projectManager,
              handleProjectChange
            )}
            {renderInput(
              "Construction Manager (CM)",
              "constructionManager",
              projectFormData.constructionManager,
              handleProjectChange
            )}
            {renderInput(
              "Project Start",
              "projectStart",
              projectFormData.projectStart,
              handleProjectChange,
              "",
              "date"
            )}
            {renderInput(
              "Project Finish",
              "projectFinish",
              projectFormData.projectFinish,
              handleProjectChange,
              "",
              "date"
            )}
            {renderInput(
              "Main Contractor",
              "mainContractor",
              projectFormData.mainContractor,
              handleProjectChange
            )}
            {renderInput(
              "Sub-Contractor",
              "subContractor",
              projectFormData.subContractor,
              handleProjectChange
            )}
            {renderInput(
              "Client Name",
              "clientName",
              projectFormData.clientName,
              handleProjectChange
            )}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Project Note
            </label>
            <textarea
              name="projectNote"
              value={projectFormData.projectNote}
              onChange={handleProjectChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t pt-4">
          <button
            type="button"
            onClick={() => setView("list")}
            className="px-6 py-2 border rounded-lg text-gray-700"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-emerald-600 rounded-lg text-white flex items-center"
          >
            <Save className="w-5 h-5 mr-2" /> บันทึกข้อมูลโครงการ
          </button>
        </div>
      </form>
    </div>
  );

  // --- WMS Form (inline) ---
  const wmsFormJSX = view === "form" && activeTab === "wms" && (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
      <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center text-white">
          <button
            onClick={() => setView("list")}
            className="mr-4 hover:bg-blue-700 p-2 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">{wmsFormData.id ? "แก้ไข Work Method Statement" : "จัดทำ Work Method Statement"}</h1>
        </div>
      </div>
      <form onSubmit={handleWMSSubmit} className="p-6 md:p-8 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            ข้อมูลทั่วไป (Header)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Selection with Fallback */}
            {projects.length > 0
              ? renderInput(
                  "โครงการ (Project)",
                  "project",
                  wmsFormData.project,
                  handleWMSChange,
                  "เลือกโครงการที่ได้สร้างไว้",
                  "select",
                  true,
                  projects.map((p) => p.projectName)
                )
              : renderInput(
                  "โครงการ (Project)",
                  "project",
                  wmsFormData.project,
                  handleWMSChange,
                  "ระบุชื่อโครงการสำหรับการจัดเก็บ",
                  "text",
                  true
                )}
            {renderInput(
              "ชื่องาน (Document Title)",
              "documentTitle",
              wmsFormData.documentTitle,
              handleWMSChange,
              "ระบุชื่องาน",
              "text",
              true
            )}
            {renderInput(
              "Revision",
              "rev",
              wmsFormData.rev,
              handleWMSChange,
              ""
            )}
            {renderInput(
              "วันที่ออกเอกสาร (Issue Date)",
              "issueDate",
              wmsFormData.issueDate,
              handleWMSChange,
              "",
              "date"
            )}
            {renderInput(
              "รายละเอียดการแก้ไข",
              "description",
              wmsFormData.description,
              handleWMSChange,
              ""
            )}
            {renderInput(
              "ผู้จัดทำ (Prepared by)",
              "preparedBy",
              wmsFormData.preparedBy,
              handleWMSChange,
              ""
            )}
            {renderInput(
              "ผู้อนุมัติ (Approved by)",
              "approvedBy",
              wmsFormData.approvedBy,
              handleWMSChange,
              ""
            )}
          </div>
        </section>
        <section>
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            เนื้อหาเอกสาร (Content)
          </h2>
          {renderInput(
            "1. SCOPE / ขอบข่ายของงาน",
            "scope",
            wmsFormData.scope,
            handleWMSChange,
            "",
            "textarea"
          )}
          {renderInput(
            "2. DEFINITION / คำนิยาม",
            "definition",
            wmsFormData.definition,
            handleWMSChange,
            "",
            "textarea"
          )}
          {renderInput(
            "3. REFERENCE / เอกสารอ้างอิง",
            "reference",
            wmsFormData.reference,
            handleWMSChange,
            "",
            "textarea"
          )}

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">
              4. EQUIPMENT AND PERSONNEL / เครื่องมืออุปกรณ์ และบุคลากร
            </h3>
            {renderInput(
              "4.1 EQUIPMENT / เครื่องมืออุปกรณ์",
              "equipment",
              wmsFormData.equipment,
              handleWMSChange,
              "",
              "textarea"
            )}
            {renderInput(
              "4.2 PERSONNEL / บุคลากร",
              "personnel",
              wmsFormData.personnel,
              handleWMSChange,
              "",
              "textarea"
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">
              5. ORGANIZATION / แผนผังองค์กร
            </h3>
            {renderInput(
              "5.1 ORGANIZATION CHART / แผนผังองค์กร",
              "orgChart",
              wmsFormData.orgChart,
              handleWMSChange,
              "",
              "textarea"
            )}
            {renderInput(
              "5.2 RESPONSIBILITY / หน้าที่และความรับผิดชอบ",
              "responsibility",
              wmsFormData.responsibility,
              handleWMSChange,
              "",
              "textarea"
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">
              6. PROCEDURE DESCRIPTION / วิธีการดำเนินการ
            </h3>
            {renderInput(
              "6.1 PREPARATION / การเตรียมการก่อนเริ่มงาน",
              "preparation",
              wmsFormData.preparation,
              handleWMSChange,
              "",
              "textarea"
            )}
            {renderInput(
              "6.2 PROCEDURE / ขั้นตอนการปฏิบัติงาน",
              "procedure",
              wmsFormData.procedure,
              handleWMSChange,
              "อธิบายขั้นตอนการทำงานทีละขั้นตอน",
              "textarea"
            )}
            {renderInput(
              "6.3 FINISH OF WORK / เมื่อเสร็จสิ้นปฏิบัติงาน",
              "finishWork",
              wmsFormData.finishWork,
              handleWMSChange,
              "",
              "textarea"
            )}
          </div>

          {renderInput(
            "7. INSPECTION AND TESTING / วิธีการตรวจสอบ และการทดสอบ",
            "inspectTesting",
            wmsFormData.inspectTesting,
            handleWMSChange,
            "",
            "textarea"
          )}
          {renderInput(
            "8. JOB SAFETY ANALYSIS / การวิเคราะห์งานเพื่อความปลอดภัย",
            "jsa",
            wmsFormData.jsa,
            handleWMSChange,
            "อันตรายที่อาจเกิดขึ้น (อ้างอิงฟอร์ม JSA)",
            "textarea"
          )}
          {renderInput(
            "9. DOCUMENTED INFORMATION / เอกสารแนบ",
            "documentedInfo",
            wmsFormData.documentedInfo,
            handleWMSChange,
            "",
            "textarea"
          )}
        </section>

        {/* Attachments Section */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
            <Paperclip size={18} /> ไฟล์แนบ (Attachments)
          </h2>

          {/* Upload Buttons Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Document Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center gap-2 bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer" onClick={() => document.getElementById('wms-doc-upload')?.click()}>
              <Paperclip size={24} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">อัปโหลดเอกสาร</span>
              <span className="text-xs text-gray-400">PDF, DOC, XLSX, ฯลฯ</span>
              <input
                id="wms-doc-upload"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                className="hidden"
                onChange={(e) => handleWMSFileUpload(e, "document")}
              />
            </div>

            {/* Photo Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center gap-2 bg-gray-50 hover:border-green-400 transition-colors cursor-pointer" onClick={() => document.getElementById('wms-photo-upload')?.click()}>
              <ImagePlus size={24} className="text-green-500" />
              <span className="text-sm font-medium text-gray-700">อัปโหลดรูปภาพ</span>
              <span className="text-xs text-gray-400">JPG, PNG, GIF, WebP</span>
              <input
                id="wms-photo-upload"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleWMSFileUpload(e, "photo")}
              />
            </div>

            {/* URL Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col gap-2 bg-gray-50">
              <div className="flex items-center gap-1 mb-1">
                <Link size={18} className="text-purple-500" />
                <span className="text-sm font-medium text-gray-700">เพิ่ม URL / ลิงก์</span>
              </div>
              <input
                type="text"
                placeholder="ชื่อลิงก์ (ไม่บังคับ)"
                value={wmsUrlNameInput}
                onChange={(e) => setWmsUrlNameInput(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <input
                type="url"
                placeholder="https://..."
                value={wmsUrlInput}
                onChange={(e) => setWmsUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleWMSAddUrl())}
                className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <button
                type="button"
                onClick={handleWMSAddUrl}
                className="w-full py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
              >
                + เพิ่มลิงก์
              </button>
            </div>
          </div>

          {/* Attachments List */}
          {(wmsFormData.attachments || []).length > 0 && (
            <div className="space-y-2">
              {(wmsFormData.attachments as any[]).map((att: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm">
                  {att.type === "photo" ? (
                    <img src={att.data} alt={att.name} className="w-12 h-12 object-cover rounded border flex-shrink-0" />
                  ) : att.type === "url" ? (
                    <div className="w-12 h-12 flex items-center justify-center bg-purple-100 rounded border flex-shrink-0">
                      <Link size={20} className="text-purple-600" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded border flex-shrink-0">
                      <Paperclip size={20} className="text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{att.name}</p>
                    <p className="text-xs text-gray-400">
                      {att.type === "photo" ? "รูปภาพ" : att.type === "url" ? "ลิงก์ URL" : "เอกสาร"}
                    </p>
                  </div>
                  {att.type === "url" && att.url && (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    >
                      <Eye size={16} />
                    </a>
                  )}
                  {att.type === "photo" && (
                    <a
                      href={att.data}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Eye size={16} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleWMSRemoveAttachment(idx)}
                    className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(wmsFormData.attachments || []).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีไฟล์แนบ</p>
          )}
        </section>

        <div className="flex justify-end gap-4 border-t pt-4">
          <button
            type="button"
            onClick={() => setView("list")}
            className="px-6 py-2 border rounded-lg text-gray-700"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 rounded-lg text-white flex items-center"
          >
            <Save className="w-5 h-5 mr-2" /> บันทึกเอกสารลง Cloud
          </button>
        </div>
      </form>
    </div>
  );

  // --- WMS Detail (inline) ---
  const wmsDetailJSX = view === "detail" && activeTab === "wms" && (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => setView("list")}
          className="flex items-center text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> กลับหน้ารายการ
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg"
          >
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </button>
          <button
            onClick={() =>
              exportToWord(
                "printable-wms",
                `${currentWMSDoc?.documentTitle || "WMS_Doc"}.doc`
              )
            }
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            <Download className="w-4 h-4 mr-2" /> Export Word
          </button>
        </div>
      </div>

      {/* Two-column layout: left = attachments sidebar, right = printable preview */}
      <div className="flex gap-6 items-start print:block">

        {/* LEFT: Attachments Sidebar */}
        <div className="w-72 flex-shrink-0 print:hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
              <Paperclip size={16} className="text-white" />
              <span className="text-white font-semibold text-sm">ไฟล์แนบ (Attachments)</span>
              <span className="ml-auto bg-gray-600 text-gray-200 text-xs px-2 py-0.5 rounded-full">
                {(currentWMSDoc?.attachments || []).length}
              </span>
            </div>

            {(currentWMSDoc?.attachments || []).length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Paperclip size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">ไม่มีไฟล์แนบ</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Documents */}
                {(currentWMSDoc?.attachments as any[] || []).filter((a: any) => a.type === "document").length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Paperclip size={12} /> เอกสาร
                    </p>
                    <div className="space-y-1">
                      {(currentWMSDoc?.attachments as any[] || []).filter((a: any) => a.type === "document").map((att: any, idx: number) => (
                        <a
                          key={idx}
                          href={att.data}
                          download={att.name}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 transition-colors group cursor-pointer"
                        >
                          <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded flex-shrink-0 group-hover:bg-blue-200">
                            <Paperclip size={14} className="text-blue-600" />
                          </div>
                          <span className="text-xs text-gray-700 truncate flex-1 group-hover:text-blue-700">{att.name}</span>
                          <Download size={12} className="text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos */}
                {(currentWMSDoc?.attachments as any[] || []).filter((a: any) => a.type === "photo").length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <ImagePlus size={12} /> รูปภาพ
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {(currentWMSDoc?.attachments as any[] || []).filter((a: any) => a.type === "photo").map((att: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLightboxSrc(att.data)}
                          className="relative group aspect-square overflow-hidden rounded border border-gray-200 hover:border-green-400 transition-colors"
                          title={att.name}
                        >
                          <img src={att.data} alt={att.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye size={14} className="text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* URLs */}
                {(currentWMSDoc?.attachments as any[] || []).filter((a: any) => a.type === "url").length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Link size={12} /> ลิงก์ URL
                    </p>
                    <div className="space-y-1">
                      {(currentWMSDoc?.attachments as any[] || []).filter((a: any) => a.type === "url").map((att: any, idx: number) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-purple-50 transition-colors group"
                        >
                          <div className="w-8 h-8 flex items-center justify-center bg-purple-100 rounded flex-shrink-0 group-hover:bg-purple-200">
                            <Link size={14} className="text-purple-600" />
                          </div>
                          <span className="text-xs text-gray-700 truncate flex-1 group-hover:text-purple-700">{att.name}</span>
                          <Eye size={12} className="text-gray-400 group-hover:text-purple-600 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Preview Document */}
        <div className="flex-1 min-w-0">
      <div
        id="printable-wms"
        className="bg-white p-10 md:p-16 rounded-xl shadow-md mx-auto"
        style={{ maxWidth: "210mm", minHeight: "297mm" }}
      >
        <div className="flex flex-row justify-between items-start mb-8 border-b-2 border-gray-800 pb-4">
          <div className="w-1/4">
            <CMGLogo />
          </div>
          <div className="w-2/4 text-center">
            <h1 className="text-2xl font-bold uppercase tracking-wider">
              Method Statement
            </h1>
            <h2 className="text-xl mt-2 font-semibold">วิธีการปฏิบัติงาน</h2>
            <h3 className="text-lg mt-2 text-gray-700">
              {currentWMSDoc?.documentTitle}
            </h3>
          </div>
          <div className="w-1/4 text-right">
            <span className="text-sm text-gray-600 font-semibold">
              FM-SHE-013-00
            </span>
          </div>
        </div>

        <table className="w-full text-sm border-collapse border border-gray-400 mb-8">
          <tbody>
            <tr>
              <th className="border border-gray-400 p-2 bg-gray-100 w-1/4 text-left">
                Project.
              </th>
              <td className="border border-gray-400 p-2 text-center font-semibold text-blue-800">
                {currentWMSDoc?.project}
              </td>
              <th className="border border-gray-400 p-2 bg-gray-100 w-1/4 text-left">
                Issue Date
              </th>
              <td className="border border-gray-400 p-2 text-center">
                {currentWMSDoc?.issueDate}
              </td>
            </tr>
            <tr>
              <th className="border border-gray-400 p-2 bg-gray-100 w-1/4 text-left">
                Rev.
              </th>
              <td className="border border-gray-400 p-2 text-center">
                {currentWMSDoc?.rev}
              </td>
              <th className="border border-gray-400 p-2 bg-gray-100 text-left">
                Description
              </th>
              <td className="border border-gray-400 p-2 text-center">
                {currentWMSDoc?.description}
              </td>
            </tr>
            <tr>
              <th className="border border-gray-400 p-2 bg-gray-100 text-left">
                Prepared by
              </th>
              <td className="border border-gray-400 p-2 text-center">
                {currentWMSDoc?.preparedBy}
              </td>
              <th className="border border-gray-400 p-2 bg-gray-100 text-left">
                Approved by
              </th>
              <td className="border border-gray-400 p-2 text-center">
                {currentWMSDoc?.approvedBy}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="space-y-6 text-sm text-gray-900 leading-relaxed">
          <div>
            <div className="font-bold bg-gray-100 p-2 uppercase">
              1. SCOPE / ขอบข่ายของงาน
            </div>
            <div
              className="mt-3 ml-4 whitespace-pre-wrap content"
              dangerouslySetInnerHTML={{ __html: currentWMSDoc?.scope || "-" }}
            />
          </div>

          <div>
            <div className="font-bold bg-gray-100 p-2 uppercase">
              2. DEFINITION / คำนิยาม
            </div>
            <div
              className="mt-3 ml-4 whitespace-pre-wrap content"
              dangerouslySetInnerHTML={{
                __html: currentWMSDoc?.definition || "-",
              }}
            />
          </div>

          <div>
            <div className="font-bold bg-gray-100 p-2 uppercase">
              3. REFERENCE / เอกสารอ้างอิง
            </div>
            <div
              className="mt-3 ml-4 whitespace-pre-wrap content"
              dangerouslySetInnerHTML={{
                __html: currentWMSDoc?.reference || "-",
              }}
            />
          </div>

          <div>
            <div className="font-bold bg-gray-100 p-2 uppercase">
              4. EQUIPMENT AND PERSONNEL / เครื่องมืออุปกรณ์ และบุคลากร
            </div>
            <div className="mt-3 ml-4">
              <div className="font-semibold mb-2">
                4.1 EQUIPMENT / เครื่องมืออุปกรณ์ที่นำมาใช้ในงาน
              </div>
              <div
                className="mb-4 whitespace-pre-wrap content pl-4"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.equipment || "-",
                }}
              />
              <div className="font-semibold mb-2">4.2 PERSONNEL / บุคลากร</div>
              <div
                className="whitespace-pre-wrap content pl-4"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.personnel || "-",
                }}
              />
            </div>
          </div>

          <div>
            <div className="font-bold bg-gray-100 p-2 uppercase">
              5. ORGANIZATION / แผนผังองค์กร
            </div>
            <div className="mt-3 ml-4">
              <div className="font-semibold mb-2">
                5.1 ORGANIZATION CHART / แผนผังองค์กร
              </div>
              <div
                className="mb-4 whitespace-pre-wrap content pl-4"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.orgChart || "-",
                }}
              />
              <div className="font-semibold mb-2">
                5.2 RESPONSIBILITY / หน้าที่และความรับผิดชอบ
              </div>
              <div
                className="whitespace-pre-wrap content pl-4"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.responsibility || "-",
                }}
              />
            </div>
          </div>

          <div>
            <div className="font-bold bg-gray-100 p-2 uppercase">
              6. PROCEDURE DESCRIPTION / วิธีการดำเนินการ
            </div>
            <div className="mt-3 ml-4">
              <div className="font-semibold mb-2">
                6.1 PREPARATION / การเตรียมการก่อนการเริ่มงาน
              </div>
              <div
                className="mb-4 whitespace-pre-wrap content pl-4"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.preparation || "-",
                }}
              />
              <div className="font-semibold mb-2">
                6.2 PROCEDURE / ขั้นตอนการปฏิบัติงาน
              </div>
              <div
                className="mb-4 whitespace-pre-wrap content pl-4"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.procedure || "-",
                }}
              />
              <div className="font-semibold mb-2">
                6.3 FINISH OF WORK / เมื่อเสร็จสิ้นการปฏิบัติงาน
              </div>
              <div
                className="whitespace-pre-wrap content pl-4"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.finishWork || "-",
                }}
              />
            </div>
          </div>

          <div>
            <div className="font-bold bg-gray-100 p-2 uppercase">
              7. INSPECTION AND TESTING / วิธีการตรวจสอบ และการทดสอบ
            </div>
            <div
              className="mt-3 ml-4 whitespace-pre-wrap content"
              dangerouslySetInnerHTML={{
                __html: currentWMSDoc?.inspectTesting || "-",
              }}
            />
          </div>

          <div>
            <div className="font-bold bg-gray-100 p-2 uppercase">
              8. JOB SAFETY ANALYSIS / การวิเคราะห์งานเพื่อความปลอดภัย
            </div>
            <div
              className="mt-3 ml-4 whitespace-pre-wrap content"
              dangerouslySetInnerHTML={{ __html: currentWMSDoc?.jsa || "-" }}
            />
          </div>

          <div>
            <div className="font-bold bg-gray-100 p-2 uppercase">
              9. DOCUMENTED INFORMATION / เอกสารแนบ
            </div>
            <div
              className="mt-3 ml-4 whitespace-pre-wrap content"
              dangerouslySetInnerHTML={{
                __html: currentWMSDoc?.documentedInfo || "-",
              }}
            />
          </div>
        </div>
      </div>
        </div>{/* end right column */}
      </div>{/* end two-column flex */}

      {/* Lightbox for photo preview */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 print:hidden"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 flex items-center gap-1 text-sm"
            >
              <X size={18} /> ปิด
            </button>
            <img src={lightboxSrc} alt="preview" className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );

  // --- JSA Form (inline) ---
  const jsaFormJSX = view === "form" && activeTab === "jsa" && (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
      <div className="bg-orange-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center text-white">
          <button
            onClick={() => setView("list")}
            className="mr-4 hover:bg-orange-700 p-2 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">{jsaFormData.id ? "แก้ไข JOB SAFETY ANALYSIS (JSA)" : "จัดทำ JOB SAFETY ANALYSIS (JSA)"}</h1>
        </div>
      </div>
      <form onSubmit={handleJSASubmit} className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-orange-50 p-6 rounded-lg border border-orange-100">
          {renderInput(
            "Client/เจ้าของโครงการ",
            "client",
            jsaFormData.client,
            handleJSAChange
          )}
          {projects.length > 0
            ? renderInput(
                "Project/โครงการ",
                "project",
                jsaFormData.project,
                handleJSAChange,
                "เลือกโครงการอ้างอิง",
                "select",
                true,
                projects.map((p) => p.projectName)
              )
            : renderInput(
                "Project/โครงการ",
                "project",
                jsaFormData.project,
                handleJSAChange,
                "ระบุชื่อโครงการ",
                "text",
                true
              )}
          {renderInput(
            "Job Title/งานที่วิเคราะห์",
            "jobTitle",
            jsaFormData.jobTitle,
            handleJSAChange,
            "",
            "text",
            true
          )}
          {renderInput(
            "ผู้จัดทำ (Prepared by)",
            "preparedBy",
            jsaFormData.preparedBy,
            handleJSAChange
          )}
          {renderInput(
            "ผู้ตรวจสอบ (Reviewed by)",
            "reviewedBy",
            jsaFormData.reviewedBy,
            handleJSAChange
          )}
          {renderInput(
            "ผู้อนุมัติ (Approved by)",
            "approvedBy",
            jsaFormData.approvedBy,
            handleJSAChange
          )}
          {renderInput(
            "Date./วันที่",
            "date",
            jsaFormData.date,
            handleJSAChange,
            "",
            "date"
          )}
          {renderInput(
            "Rev./ปรับปรุงครั้งที่",
            "rev",
            jsaFormData.rev,
            handleJSAChange
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-left bg-white">
            <thead className="bg-gray-100 text-gray-700 text-sm">
              <tr>
                <th className="p-3 w-12 text-center">No.</th>
                <th className="p-3 w-1/4">ขั้นตอนการปฏิบัติงาน (Job step)</th>
                <th className="p-3 w-1/4">อันตรายที่อาจเกิดขึ้น (Hazard)</th>
                <th className="p-3 w-1/4">
                  มาตรการแก้ไขและควบคุม (Control measure)
                </th>
                <th className="p-3">ผู้รับผิดชอบ</th>
                <th className="p-3 w-16 text-center">ลบ</th>
              </tr>
            </thead>
            <tbody>
              {jsaFormData.items.map((item: any, index: number) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2 text-center font-medium text-gray-500">
                    {index + 1}
                  </td>
                  <td className="p-2">
                    <textarea
                      rows={3}
                      className="w-full p-2 border rounded resize-none text-sm outline-none focus:ring-1 focus:ring-orange-500"
                      value={item.step}
                      onChange={(e) =>
                        handleJSAItemChange(index, "step", e.target.value)
                      }
                      required
                      placeholder="ระบุขั้นตอน..."
                    />
                  </td>
                  <td className="p-2">
                    <textarea
                      rows={3}
                      className="w-full p-2 border rounded resize-none text-sm outline-none focus:ring-1 focus:ring-orange-500"
                      value={item.hazard}
                      onChange={(e) =>
                        handleJSAItemChange(index, "hazard", e.target.value)
                      }
                      required
                      placeholder="ระบุอันตราย..."
                    />
                  </td>
                  <td className="p-2">
                    <textarea
                      rows={3}
                      className="w-full p-2 border rounded resize-none text-sm outline-none focus:ring-1 focus:ring-orange-500"
                      value={item.control}
                      onChange={(e) =>
                        handleJSAItemChange(index, "control", e.target.value)
                      }
                      required
                      placeholder="ระบุมาตรการ..."
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full p-2 border rounded text-sm outline-none focus:ring-1 focus:ring-orange-500"
                      value={item.responder}
                      onChange={(e) =>
                        handleJSAItemChange(index, "responder", e.target.value)
                      }
                      placeholder="ชื่อ/ตำแหน่ง"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeJSAItem(index)}
                      className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded transition"
                    >
                      <MinusCircle size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 bg-gray-50 border-t flex justify-center">
            <button
              type="button"
              onClick={addJSAItem}
              className="flex items-center px-4 py-2 bg-green-100 text-green-700 font-semibold rounded-lg hover:bg-green-200 transition shadow-sm border border-green-200"
            >
              <PlusCircle size={18} className="mr-2" /> เพิ่มขั้นตอน (Add Row)
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t pt-4">
          <button
            type="button"
            onClick={() => setView("list")}
            className="px-6 py-2 border rounded-lg text-gray-700"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-orange-600 rounded-lg text-white flex items-center"
          >
            <Save className="w-5 h-5 mr-2" /> บันทึก JSA ลง Cloud
          </button>
        </div>
      </form>
    </div>
  );

  // --- JSA Detail (inline) ---
  const jsaDetailJSX = view === "detail" && activeTab === "jsa" && (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => setView("list")}
          className="flex items-center text-gray-600 hover:text-orange-600"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> กลับหน้ารายการ
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg"
          >
            <Printer className="w-4 h-4 mr-2" /> พิมพ์ (Landscape)
          </button>
          <button
            onClick={() =>
              exportToWord(
                "printable-jsa",
                `JSA_${currentJSADoc?.jobTitle || "Document"}.doc`,
                true
              )
            }
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg"
          >
            <Download className="w-4 h-4 mr-2" /> Export Word
          </button>
        </div>
      </div>

      {/* Printable Area - Designed for Landscape A4 */}
      <div
        id="printable-jsa"
        className="bg-white shadow-md mx-auto print:shadow-none"
        style={{ maxWidth: "297mm", minHeight: "210mm", padding: "15mm" }}
      >
        {/* JSA Header Section */}
        <div className="jsa-header bg-[#fae6d1] border border-black mb-4 p-4 rounded-sm text-sm">
          <div className="flex justify-between items-center mb-4 border-b border-black pb-2">
            <div className="w-1/4">
              <CMGLogo />
            </div>
            <div className="w-2/4 text-center">
              <h1 className="text-lg font-bold">
                JOB SAFETY ANALYSIS / การวิเคราะห์งานเพื่อความปลอดภัย
              </h1>
            </div>
            <div className="w-1/4 text-right text-xs font-semibold">
              FM-SHE-005/00
            </div>
          </div>

          <div className="grid grid-cols-12 gap-x-4 gap-y-2">
            <div className="col-span-5 flex">
              <span className="w-40 font-semibold">
                Client/เจ้าของโครงการ :
              </span>
              <span className="border-b border-black flex-1 ml-2">
                {currentJSADoc?.client}
              </span>
            </div>
            <div className="col-span-4 flex">
              <span className="w-24 font-semibold">ผู้จัดทำ :</span>
              <span className="border-b border-black flex-1 ml-2">
                {currentJSADoc?.preparedBy}
              </span>
            </div>
            <div className="col-span-3 flex">
              <span className="w-28 font-semibold">Date./วันที่ :</span>
              <span className="border-b border-black flex-1 ml-2">
                {currentJSADoc?.date}
              </span>
            </div>

            <div className="col-span-5 flex">
              <span className="w-40 font-semibold">Project/โครงการ :</span>
              <span className="border-b border-black flex-1 ml-2 text-blue-800 font-semibold">
                {currentJSADoc?.project}
              </span>
            </div>
            <div className="col-span-4 flex">
              <span className="w-24 font-semibold">ผู้ตรวจสอบ :</span>
              <span className="border-b border-black flex-1 ml-2">
                {currentJSADoc?.reviewedBy}
              </span>
            </div>
            <div className="col-span-3 flex">
              <span className="w-28 font-semibold">
                Rev./ปรับปรุงครั้งที่ :
              </span>
              <span className="border-b border-black flex-1 ml-2">
                {currentJSADoc?.rev}
              </span>
            </div>

            <div className="col-span-5 flex">
              <span className="w-40 font-semibold">
                Job Title/งานที่วิเคราะห์ :
              </span>
              <span className="border-b border-black flex-1 ml-2">
                {currentJSADoc?.jobTitle}
              </span>
            </div>
            <div className="col-span-4 flex">
              <span className="w-24 font-semibold">ผู้อนุมัติ :</span>
              <span className="border-b border-black flex-1 ml-2">
                {currentJSADoc?.approvedBy}
              </span>
            </div>
            <div className="col-span-3"></div>
          </div>
        </div>

        {/* JSA Table Section */}
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-[#fae6d1]">
              <th className="border border-black p-2 w-12 text-center">
                ลำดับที่
                <br />
                <span className="text-xs font-normal">No.</span>
              </th>
              <th className="border border-black p-2 w-[25%] text-center">
                ขั้นตอนการปฏิบัติงาน
                <br />
                <span className="text-xs font-normal">Job step</span>
              </th>
              <th className="border border-black p-2 w-[30%] text-center">
                อันตรายที่อาจเกิดขึ้น
                <br />
                <span className="text-xs font-normal">
                  Hazard Identification
                </span>
              </th>
              <th className="border border-black p-2 w-[30%] text-center">
                มาตรการดำเนินการเพื่อแก้ไขและควบคุม
                <br />
                <span className="text-xs font-normal">
                  Control/Reduce measure activities
                </span>
              </th>
              <th className="border border-black p-2 w-32 text-center">
                ผู้รับผิดชอบ
                <br />
                <span className="text-xs font-normal">Responded by</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-[#e6f2e6]">
            {currentJSADoc?.items.map((item: any, index: number) => (
              <tr key={index} className="border border-black dotted-border">
                <td className="border-r border-l border-black p-2 text-center align-top border-b border-dotted">
                  {index + 1}
                </td>
                <td className="border-r border-black p-2 align-top whitespace-pre-wrap border-b border-dotted">
                  {item.step}
                </td>
                <td className="border-r border-black p-2 align-top whitespace-pre-wrap border-b border-dotted">
                  {item.hazard}
                </td>
                <td className="border-r border-black p-2 align-top whitespace-pre-wrap border-b border-dotted">
                  {item.control}
                </td>
                <td className="border-r border-black p-2 align-top text-center border-b border-dotted">
                  {item.responder}
                </td>
              </tr>
            ))}
            {/* Add empty rows if items are few, to make it look like a full form */}
            {Array.from({
              length: Math.max(0, 5 - (currentJSADoc?.items.length || 0)),
            }).map((_, i) => (
              <tr
                key={`empty-${i}`}
                className="border border-black dotted-border h-10"
              >
                <td className="border-r border-l border-black border-b border-dotted"></td>
                <td className="border-r border-black border-b border-dotted"></td>
                <td className="border-r border-black border-b border-dotted"></td>
                <td className="border-r border-black border-b border-dotted"></td>
                <td className="border-r border-black border-b border-dotted"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- Main Layout ---
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Sidebar - Hidden on print */}
      <div className="w-64 bg-gray-900 text-white flex flex-col print:hidden shadow-xl z-10">
        <div className="p-5 font-bold text-xl border-b border-gray-800 tracking-wider">
          SHE System
        </div>
        <nav className="flex-1 pt-4 pb-4 space-y-2 px-3">
          <button
            onClick={() => {
              setActiveTab("project");
              setView("list");
            }}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
              activeTab === "project"
                ? "bg-emerald-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Briefcase className="w-5 h-5 mr-3" />
            <div className="text-left">
              <div className="font-semibold leading-tight">ข้อมูลโครงการ</div>
              <div className="text-[10px] opacity-70">Projects</div>
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab("wms");
              setView("list");
            }}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
              activeTab === "wms"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <FileText className="w-5 h-5 mr-3" />
            <div className="text-left">
              <div className="font-semibold leading-tight">
                Method Statement
              </div>
              <div className="text-[10px] opacity-70">WMS Document</div>
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab("jsa");
              setView("list");
            }}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
              activeTab === "jsa"
                ? "bg-orange-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-5 h-5 mr-3" />
            <div className="text-left">
              <div className="font-semibold leading-tight">
                Job Safety Analysis
              </div>
              <div className="text-[10px] opacity-70">JSA Form</div>
            </div>
          </button>
        </nav>

        {/* จัดการผู้ใช้งาน - เฉพาะ SuperAdmin/Admin */}
        {canManageUsers && (
          <div className="border-t border-gray-800 pt-2 px-3 pb-2">
            <button
              onClick={() => {
                setActiveTab("users");
                setView("list");
              }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeTab === "users"
                  ? "bg-violet-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Users className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold leading-tight">จัดการผู้ใช้งาน</div>
                <div className="text-[10px] opacity-70">User Management</div>
              </div>
            </button>
          </div>
        )}

        {/* Firebase Status Indicator */}
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-xs">
              {user ? (
                <>
                  <div className="flex items-center mr-2">
                    <Wifi className="w-3 h-3 text-green-400 mr-1" />
                    <Database className="w-3 h-3 text-green-400" />
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-green-400 font-medium">Connected</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center mr-2">
                    <Wifi className="w-3 h-3 text-red-400 mr-1 opacity-50" />
                    <Database className="w-3 h-3 text-red-400 opacity-50" />
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                    <span className="text-red-400 font-medium">Offline</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto print:overflow-visible relative">
        {/* Dynamic List Views based on activeTab */}
        {view === "list" && (
          <div className="p-6 md:p-8 print:hidden max-w-7xl mx-auto">
            {/* Header: จัดการผู้ใช้งาน (ไม่มีปุ่มสร้างใหม่) */}
            {activeTab === "users" ? (
              <div className="mb-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg mr-4 bg-violet-100 text-violet-600">
                    <Users size={28} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้งาน</h1>
                    <p className="text-gray-500 text-sm mt-1">User Management (SuperAdmin/Admin)</p>
                  </div>
                </div>
              </div>
            ) : (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center mb-4 md:mb-0">
                <div
                  className={`p-3 rounded-lg mr-4 ${
                    activeTab === "wms"
                      ? "bg-blue-100 text-blue-600"
                      : activeTab === "jsa"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {activeTab === "wms" ? (
                    <LayoutDashboard size={28} />
                  ) : activeTab === "jsa" ? (
                    <ShieldAlert size={28} />
                  ) : (
                    <Briefcase size={28} />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {activeTab === "wms"
                      ? "Method Statement (WMS)"
                      : activeTab === "jsa"
                      ? "Job Safety Analysis (JSA)"
                      : "ข้อมูลโครงการ (Projects)"}
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">
                    {activeTab === "wms"
                      ? "ระบบจัดการรายการเอกสารวิธีการปฏิบัติงาน"
                      : activeTab === "jsa"
                      ? "ระบบจัดการรายการการวิเคราะห์ความปลอดภัย"
                      : "ระบบจัดการข้อมูลโครงการหลักอ้างอิง"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (activeTab === "wms") setWmsFormData(initialWMSFormState);
                  if (activeTab === "jsa") setJsaFormData(initialJSAFormState);
                  if (activeTab === "project")
                    setProjectFormData(initialProjectFormState);
                  setView("form");
                }}
                className={`flex items-center px-5 py-2.5 text-white rounded-lg shadow-sm transition-all font-medium ${
                  activeTab === "wms"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : activeTab === "jsa"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <Plus className="w-5 h-5 mr-2" /> สร้างใหม่
              </button>
            </div>
            )}

            {/* Filter Section (Only for WMS/JSA) */}
            {activeTab !== "project" && activeTab !== "users" && (
              <div className="mb-4 flex items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200 w-fit">
                <Filter className="w-5 h-5 text-gray-400 mr-2" />
                <span className="font-medium text-gray-700 mr-3">
                  ตัวกรองโครงการ :
                </span>
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none min-w-[200px]"
                >
                  <option value="All">แสดงทั้งหมด (All Projects)</option>
                  {allProjectNames.map((p, i) => (
                    <option key={i} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Conditional Table Rendering based on Tab */}

              {/* จัดการผู้ใช้งาน */}
              {activeTab === "users" &&
                (adminUsersLoading ? (
                  <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
                ) : (
                  <>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-600 border-b">
                        <tr>
                          <th className="px-6 py-3 font-semibold">อีเมล</th>
                          <th className="px-6 py-3 font-semibold">ชื่อ-นามสกุล</th>
                          <th className="px-6 py-3 font-semibold">ตำแหน่ง</th>
                          <th className="px-6 py-3 font-semibold">บทบาท</th>
                          <th className="px-6 py-3 font-semibold">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {adminUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">{u.email}</td>
                            <td className="px-6 py-4">{u.firstName} {u.lastName}</td>
                            <td className="px-6 py-4">{u.position || "-"}</td>
                            <td className="px-6 py-4">{Array.isArray(u.role) ? u.role.join(", ") : "-"}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  u.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : u.status === "pending"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {u.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="px-6 py-3 text-sm text-gray-500 border-t border-gray-100">
                      อัปเดตสถานะ/บทบาทใน Firestore: JSA Work Method/root/users/{"{uid}"}
                    </p>
                  </>
                ))}

              {/* Project Table */}
              {activeTab === "project" &&
                (projects.length === 0 ? (
                  <div className="p-16 text-center text-gray-400">
                    <div className="flex justify-center mb-4 opacity-50">
                      <Briefcase size={48} />
                    </div>
                    <p>ยังไม่มีข้อมูลโครงการในระบบ</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                      <tr>
                        <th className="px-6 py-4 font-semibold w-32">
                          Project No.
                        </th>
                        <th className="px-6 py-4 font-semibold">
                          Project Name
                        </th>
                        <th className="px-6 py-4 font-semibold">Location</th>
                        <th className="px-6 py-4 font-semibold">Client</th>
                        <th className="px-6 py-4 font-semibold w-24 text-right">
                          จัดการ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {projects.map((proj) => (
                        <tr key={proj.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-emerald-700">
                            {proj.projectNo || "-"}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-800">
                            {proj.projectName || "(ไม่มีชื่อโครงการ)"}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {proj.location || "-"}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {proj.clientName || "-"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => deleteProject(proj.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md font-medium transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}

              {/* WMS / JSA Table */}
              {(activeTab === "wms" || activeTab === "jsa") &&
                (displayDocuments.length === 0 ? (
                  <div className="p-16 text-center text-gray-400">
                    <div className="flex justify-center mb-4 opacity-50">
                      {activeTab === "wms" ? (
                        <FileText size={48} />
                      ) : (
                        <ShieldAlert size={48} />
                      )}
                    </div>
                    <p>
                      ยังไม่มีรายการเอกสารในหมวดหมู่นี้ หรือ โครงการที่คุณเลือก
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                      <tr>
                        <th className="px-6 py-4 font-semibold w-48">
                          โครงการ (Project)
                        </th>
                        <th className="px-6 py-4 font-semibold">
                          ชื่องาน (Job Title)
                        </th>
                        <th className="px-6 py-4 font-semibold w-20 text-center">
                          Rev.
                        </th>
                        <th className="px-6 py-4 font-semibold w-32">
                          วันที่ (Date)
                        </th>
                        <th className="px-6 py-4 font-semibold w-32">
                          ผู้จัดทำ
                        </th>
                        <th className="px-6 py-4 font-semibold w-36 text-right">
                          จัดการ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayDocuments.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-semibold text-blue-700">
                            {doc.project || "-"}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-800">
                            {activeTab === "wms"
                              ? doc.documentTitle
                              : doc.jobTitle || "(ไม่มีชื่อ)"}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500">
                            {doc.rev}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {activeTab === "wms" ? doc.issueDate : doc.date}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {doc.preparedBy || "-"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  activeTab === "wms"
                                    ? setCurrentWMSDoc(doc)
                                    : setCurrentJSADoc(doc);
                                  setView("detail");
                                }}
                                className={`inline-flex items-center px-3 py-1.5 rounded-md font-medium transition-colors ${
                                  activeTab === "wms"
                                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                    : "bg-orange-50 text-orange-600 hover:bg-orange-100"
                                }`}
                              >
                                เปิดดู
                              </button>
                              <button
                                onClick={() => {
                                  if (activeTab === "wms") {
                                    setWmsFormData({ ...doc, attachments: doc.attachments || [] });
                                    setView("form");
                                  } else {
                                    setJsaFormData({ ...doc, items: doc.items || [] });
                                    setView("form");
                                  }
                                }}
                                className={`inline-flex items-center px-3 py-1.5 rounded-md font-medium transition-colors ${
                                  activeTab === "wms"
                                    ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                    : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                }`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                แก้ไข
                              </button>
                              <button
                                onClick={() =>
                                  activeTab === "wms"
                                    ? deleteWMS(doc.id)
                                    : deleteJSA(doc.id)
                                }
                                className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md font-medium transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
            </div>
          </div>
        )}

        {/* Dynamic Form & Detail Views (inline เพื่อไม่ให้เคอร์เซอร์เด้งออกตอนพิมพ์) */}
        <div className="print:p-0">
          {projectFormJSX}
          {wmsFormJSX}
          {wmsDetailJSX}
          {jsaFormJSX}
          {jsaDetailJSX}
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block; /* For Firefox */
        }
      `,
        }}
      />
    </div>
  );
}

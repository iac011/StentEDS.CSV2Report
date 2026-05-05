/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  setDoc,
  doc,
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import Papa from 'papaparse';
import { 
  Database, 
  FileUp, 
  LogOut, 
  FlaskConical, 
  ChevronRight, 
  History, 
  Plus, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Microscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, googleProvider, OperationType, handleFirestoreError } from './lib/firebase';
import { StentReport } from './types';
import { ReportDocument } from './components/ReportDocument';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<StentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<StentReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setReports([]);
      return;
    }

    const q = query(
      collection(db, 'stentReports'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StentReport));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReports(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'stentReports');
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError("Login failed. Please try again.");
    }
  };

  const handleLogout = () => signOut(auth);

  const processCSVData = (csvText: string) => {
    if (!user) return;
    setSyncing(true);
    setError(null);

    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const dataToUpload = (results.data as any[]).filter((row: any) => row.Sample && (row['Stent Material'] || row['Stent_Material']));
        
        if (dataToUpload.length === 0) {
          setError("No valid stent data found in CSV. Check column headers.");
          setSyncing(false);
          return;
        }

        try {
          for (const row of dataToUpload) {
            const reportData = {
              ownerId: user.uid,
              sample: row.Sample || row.sample,
              stentMaterial: row['Stent Material'] || row['Stent_Material'] || 'Unknown',
              stentRodArea: Number(row.Stent_Rod_Area || row.stent_rod_area || 0),
              calcArea: Number(row.Calc_Area || row.calc_area || 0),
              encapArea: Number(row.Encap_Area || row.encap_area || 0),
              encapRatioVsCalc: Number(row.Encap_Ratio_vs_Calc || row.encap_ratio_vs_calc || 0),
              encapRatioVsStent: Number(row.Encap_Ratio_vs_Stent || row.encap_ratio_vs_stent || 0),
              calcDistMean: Number(row.Calc_Dist_Mean || row.calc_dist_mean || 0),
              calcDistMax: Number(row.Calc_Dist_Max || row.calc_dist_max || 0),
              calcDistMin: Number(row.Calc_Dist_Min || row.calc_dist_min || 0),
              createdAt: new Date().toISOString(),
              status: 'final' as const
            };

            await addDoc(collection(db, 'stentReports'), reportData);
          }
        } catch (err) {
          console.error("Firestore Upload Error:", err);
          setError("Failed to save data to database.");
        } finally {
          setSyncing(false);
        }
      },
      error: (err) => {
        console.error("CSV Parse Error:", err);
        setError("Failed to parse CSV file.");
        setSyncing(false);
      }
    });
  };

  const importCSVData = async () => {
    if (!user) return;
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/Stent_Material_Report.csv');
      if (!response.ok) throw new Error("File not found");
      const csvText = await response.text();
      processCSVData(csvText);
    } catch (err) {
      console.error("Fetch Error:", err);
      setError("Default Stent_Material_Report.csv not found in public folder. Please upload manually.");
      setSyncing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSVData(text);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processCSVData(text);
      };
      reader.readAsText(file);
    } else {
      setError("Please drop a valid CSV file.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-1.5 rounded-lg">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-serif font-bold tracking-tight">Computational Materia Medica</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold leading-none">{user.displayName}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user.email}</p>
                  </div>
                  <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-slate-200 shadow-sm" />
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-medium text-sm flex items-center gap-2"
              >
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!user ? (
          <div className="max-w-md mx-auto mt-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Database className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-4">Scientific Database Login</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Access the Stent Material Analysis system to import laboratory data and generate high-fidelity scientific reports.
              </p>
              <button 
                onClick={handleLogin}
                className="w-full py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold tracking-tight shadow-md"
              >
                Secure Authentication
              </button>
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar List */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-slate-500">
                    <History className="w-4 h-4" /> Lab Records
                  </h3>
                  <button 
                    onClick={importCSVData}
                    disabled={syncing}
                    className="text-[10px] bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full font-bold uppercase tracking-tighter hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Sync Defaults
                  </button>
                </div>

                {/* Upload Zone */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative mb-6 p-6 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                    isDragging ? 'border-slate-900 bg-slate-50 scale-[0.98]' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="bg-slate-100 p-2 rounded-lg mb-3">
                    <FileUp className="w-5 h-5 text-slate-500" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 mb-1">Click or drag CSV</p>
                  <p className="text-[10px] text-slate-500">Stent_Material_Report.csv</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {reports.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <FileUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-xs font-medium">No records found.<br/>Sync with lab CSV to begin.</p>
                    </div>
                  ) : (
                    reports.map((report) => (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => setSelectedReport(report)}
                        className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                          selectedReport?.id === report.id 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200' 
                            : 'bg-white border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className={`text-xs font-bold leading-tight ${selectedReport?.id === report.id ? 'text-slate-300' : 'text-slate-500'}`}>
                            {report.stentMaterial}
                          </p>
                          {report.status === 'final' && (
                            <CheckCircle2 className={`w-3 h-3 ${selectedReport?.id === report.id ? 'text-blue-400' : 'text-green-500'}`} />
                          )}
                        </div>
                        <h4 className="font-serif font-bold text-lg mb-1 leading-tight">{report.sample}</h4>
                        <div className="flex items-center justify-between mt-4">
                          <span className={`text-[10px] font-mono ${selectedReport?.id === report.id ? 'text-slate-400' : 'text-slate-400'}`}>
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                          <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${selectedReport?.id === report.id ? 'text-white' : 'text-slate-300'}`} />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Main Content / Report View */}
            <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                {selectedReport ? (
                  <motion.div
                    key={selectedReport.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <ReportDocument report={selectedReport} />
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full min-h-[60vh] bg-white rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-12 text-center"
                  >
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <Microscope className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-slate-400 mb-2">Microscopic Identification Pending</h3>
                    <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
                      Select a morphological record from the laboratory database to generate a Nature Materials compliant analytical report.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

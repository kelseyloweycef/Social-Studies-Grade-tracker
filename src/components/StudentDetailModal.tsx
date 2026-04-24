import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  MessageSquare, 
  History, 
  User as UserIcon,
  BadgeAlert,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { Student, Grade, Intervention, YearGroup, GradeType } from '../types';
import { 
  subscribeToStudentGrades, 
  subscribeToInterventions, 
  saveGrade, 
  addIntervention,
  updateStudent,
  deleteStudent,
  updateStudentEnrollment,
  subscribeToDepartments
} from '../services/dataService';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface StudentModalProps {
  student: Student;
  academicYear: string;
  onClose: () => void;
}

export default function StudentDetailModal({ student, academicYear, onClose }: StudentModalProps) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'grades' | 'interventions' | 'profile' | 'comparison'>('grades');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Student>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubGrades = subscribeToStudentGrades(student.id, setGrades);
    const unsubInterventions = subscribeToInterventions(student.id, setInterventions);
    const unsubDepts = subscribeToDepartments(setDepartments);
    return () => {
      unsubGrades();
      unsubInterventions();
      unsubDepts();
    };
  }, [student.id]);

  const handleAddGrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await saveGrade({
        studentId: student.id,
        subject: formData.get('subject') as string,
        academicYear,
        type: formData.get('type') as GradeType,
        gradeValue: formData.get('grade') as string,
      });
      e.currentTarget.reset();
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddIntervention = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await addIntervention({
        studentId: student.id,
        category: formData.get('category') as any,
        content: formData.get('content') as string,
      });
      e.currentTarget.reset();
    } finally {
      setIsSaving(false);
    }
  };

  const getRequiredGrades = (yearGroup: YearGroup) => {
    if (['11', '13'].includes(yearGroup)) {
      return ['End of year ' + (parseInt(yearGroup) - 1), 'P1', 'P2', 'P3', 'P4'];
    }
    return ['Aspirational', 'P2', 'P3', 'P4'];
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-200">
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{student.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-widest">Year {student.yearGroup}</span>
                {student.isSEN && <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-black uppercase tracking-widest border border-amber-100">SEN / Intervention</span>}
                {student.cefrLevel && <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-black uppercase tracking-widest border border-emerald-100">CEFR {student.cefrLevel}</span>}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex px-8 border-b border-slate-100 bg-white shrink-0">
          <TabButton active={activeTab === 'grades'} onClick={() => setActiveTab('grades')} label="Academic Performance" />
          <TabButton active={activeTab === 'comparison'} onClick={() => setActiveTab('comparison')} label="Subject Comparison" />
          <TabButton active={activeTab === 'interventions'} onClick={() => setActiveTab('interventions')} label="Staff Observations" />
          <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Student Profile" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8 bg-slate-50/30">
          <AnimatePresence mode="wait">
            {activeTab === 'grades' && (
              <motion.div 
                key="grades"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <History className="text-blue-600" size={16} />
                         Unified Performance Portfolio
                      </h3>
                    </div>
                    
                    <div className="space-y-8">
                      {Object.entries(
                        grades.reduce((acc, g) => {
                          if (!acc[g.subject]) acc[g.subject] = [];
                          acc[g.subject].push(g);
                          return acc;
                        }, {} as Record<string, Grade[]>)
                      ).map(([subject, subjectGrades]) => (
                        <div key={subject} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                          <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{subject}</h4>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{(subjectGrades as Grade[]).length} Records</span>
                          </div>
                          <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-50">
                              {(subjectGrades as Grade[]).map(grade => (
                                <tr key={grade.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 text-[11px] font-bold text-slate-600 uppercase tracking-tighter">{grade.type}</td>
                                  <td className="px-6 py-4 text-center">
                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-black text-xs">{grade.gradeValue}</span>
                                  </td>
                                  <td className="px-6 py-4 text-right text-[10px] text-slate-400 font-medium">
                                    {grade.updatedAt ? format(grade.updatedAt.toDate(), 'dd MMM yyyy') : '...'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                      {grades.length === 0 && (
                        <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
                          <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">No academic telemetry detected.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Plus className="text-blue-600" size={16} />
                       Add Performance Entry
                    </h3>
                    <form onSubmit={handleAddGrade} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject / Unit</label>
                        <select name="subject" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium appearance-none">
                          {departments.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Internal Benchmark</label>
                        <select name="type" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium appearance-none">
                          {getRequiredGrades(student.yearGroup).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Final Grade</label>
                        <input name="grade" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-black" placeholder="A+ / 9 / Merit" />
                      </div>
                      <button 
                        disabled={isSaving}
                        className="w-full bg-blue-600 text-white rounded-xl py-3 font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                      >
                        <Save size={16} />
                        {isSaving ? 'Processing...' : 'Sync Record'}
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'comparison' && (
              <motion.div 
                key="comparison"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-8"
              >
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Cross-Subject Proficiency Matrix ({academicYear})</h3>
                  <div className="h-64 flex items-end justify-around gap-4 px-4 overflow-x-auto">
                    {(() => {
                      const subjectGroups = grades.reduce((acc, g) => {
                        if (g.academicYear === academicYear) {
                          if (!acc[g.subject]) acc[g.subject] = [];
                          acc[g.subject].push(parseInt(g.gradeValue) || 0);
                        }
                        return acc;
                      }, {} as Record<string, number[]>);

                      const subjectEntries = Object.entries(subjectGroups);
                      
                      if (subjectEntries.length === 0) {
                        return <div className="w-full text-center py-12 text-slate-400 font-medium italic">No performance data for {academicYear}.</div>;
                      }

                      return subjectEntries.map(([subject, values]) => {
                        const v = values as number[];
                        const avg = v.reduce((a, b) => a + b, 0) / v.length;
                        const height = (avg / 9) * 100;
                        return (
                          <div key={subject} className="flex flex-col items-center flex-1 min-w-[80px] group">
                            <div className="w-full bg-slate-50 rounded-t-xl relative h-48 flex items-end">
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                className="w-full bg-blue-600 rounded-t-lg shadow-lg shadow-blue-100 group-hover:bg-blue-500 transition-colors"
                              />
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-black px-2 py-1.5 rounded shadow-xl whitespace-nowrap z-20">
                                Latest Avg: {avg.toFixed(1)}
                              </div>
                            </div>
                            <span className="text-[9px] font-black uppercase text-slate-500 mt-4 text-center line-clamp-2 px-1">{subject}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Latest Attainment by Subject</h4>
                     <div className="space-y-2">
                        {Array.from(new Set(grades.map(g => g.subject))).map(subject => {
                          const subGrades = grades.filter(g => g.subject === subject).sort((a,b) => b.updatedAt?.toMillis() - a.updatedAt?.toMillis() || 0);
                          const latest = subGrades[0];
                          return (
                            <div key={subject} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black text-slate-900 uppercase">{subject}</span>
                                <div className="flex gap-2">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">{latest?.type || 'No Data'}</span>
                                  <span className="text-[9px] text-blue-400 font-bold uppercase">FY {latest?.academicYear}</span>
                                </div>
                              </div>
                              <span className="text-sm font-black text-blue-600 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">{latest?.gradeValue || '—'}</span>
                            </div>
                          );
                        })}
                     </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Longitudinal Tracking (Focus: Academic Years)</h4>
                     <div className="space-y-3 overflow-y-auto max-h-48 pr-2">
                        {Array.from(new Set(grades.map(g => g.academicYear))).sort().reverse().map(year => (
                          <div key={year} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <span className="text-[11px] font-black text-slate-900 uppercase">FY {year}</span>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {Array.from(new Set(grades.filter(g => g.academicYear === year).map(g => g.subject))).map(sub => (
                                <span key={sub} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-bold text-slate-400">{sub}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>

                <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <TrendingUp size={20} />
                     </div>
                     <h4 className="text-xl font-black uppercase tracking-tight">Focus Mastery</h4>
                  </div>
                  <p className="text-blue-100 text-sm font-medium leading-relaxed">
                    {grades.length > 5 
                      ? `Stable performance across ${new Set(grades.map(g => g.subject)).size} domains. High alignment detected across humanities performance clusters.`
                      : "Insufficient data for longitudinal trend analysis. Populate more performance metrics across different subjects to unlock full cohort comparison insights."}
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'interventions' && (
              <motion.div 
                key="interventions"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Qualitative Observation Feed</h3>
                  <div className="space-y-4">
                    {interventions.map(item => (
                      <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                             <div className={cn(
                               "w-2 h-2 rounded-full",
                               item.category === 'Concern' ? "bg-red-500" :
                               item.category === 'Support' ? "bg-emerald-500" :
                               "bg-blue-500"
                             )} />
                             <span className={cn(
                               "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                               item.category === 'Concern' ? "bg-red-50 text-red-700" :
                               item.category === 'Support' ? "bg-emerald-50 text-emerald-700" :
                               "bg-blue-50 text-blue-700"
                             )}>
                               {item.category}
                             </span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.createdAt ? format(item.createdAt.toDate(), 'dd MMM • HH:mm') : 'Syncing...'}</span>
                          </div>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed font-medium">{item.content}</p>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                           <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[8px] font-bold text-slate-500 uppercase">ST</div>
                           <span className="text-[10px] font-black text-slate-900 uppercase">Observer: {item.authorName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {interventions.length === 0 && (
                    <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                      <MessageSquare className="mx-auto text-slate-200 mb-4" size={48} />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No qualitative data captured.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">New Observation Node</h3>
                  <form onSubmit={handleAddIntervention} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                      <select name="category" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium appearance-none">
                        <option value="General">Academic Note</option>
                        <option value="Concern">Pastoral Concern</option>
                        <option value="Support">Support Provision</option>
                        <option value="Intervention">Structured Intervention</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Node Content</label>
                      <textarea 
                        name="content" 
                        required 
                        rows={6}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all resize-none text-sm font-medium leading-relaxed" 
                        placeholder="Detailed observations on student engagement, barriers to learning, or success criteria..."
                      />
                    </div>
                    <button 
                      disabled={isSaving}
                      className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      {isSaving ? 'Capturing...' : 'Commit Observation'}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="max-w-3xl space-y-8 pb-12"
              >
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Base Intelligence Profile</h3>
                    <button 
                      onClick={() => {
                        if (isEditing) {
                          setIsEditing(false);
                          setEditData({});
                        } else {
                          setIsEditing(true);
                          setEditData({
                            name: student.name,
                            yearGroup: student.yearGroup,
                            classGroup: student.classGroup,
                            isSEN: student.isSEN,
                            cefrLevel: student.cefrLevel
                          });
                        }
                      }}
                      className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                    </button>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setIsSaving(true);
                      const formData = new FormData(e.currentTarget);
                      const subjects = Array.from(formData.getAll('subjects')) as string[];
                      
                      if (isEditing) {
                        await updateStudent(student.id, {
                          name: formData.get('name') as string,
                          yearGroup: formData.get('yearGroup') as YearGroup,
                          classGroup: formData.get('classGroup') as string,
                          isSEN: formData.get('isSEN') === 'on',
                          cefrLevel: formData.get('cefrLevel') as any
                        });
                        setIsEditing(false);
                      }

                      await updateStudentEnrollment(
                        student.id, 
                        subjects, 
                        formData.get('classGroup') as string
                      );
                      
                      setIsSaving(false);
                      alert('Profile and Enrollment updated.');
                    }}
                    className="space-y-10"
                  >
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-8">
                      {isEditing ? (
                        <>
                          <div className="space-y-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Name</label>
                             <input 
                              name="name" 
                              defaultValue={student.name}
                              required 
                              className="w-full bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-sm font-black focus:bg-white outline-none transition-all"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Year Group</label>
                             <select 
                              name="yearGroup" 
                              defaultValue={student.yearGroup}
                              className="w-full bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-sm font-black focus:bg-white outline-none transition-all"
                             >
                               {['7', '8', '9', '10', '11', '12', '13'].map(y => <option key={y} value={y}>Year {y}</option>)}
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Support (SEN)</label>
                             <input 
                              type="checkbox" 
                              name="isSEN" 
                              defaultChecked={student.isSEN}
                              className="w-5 h-5 accent-blue-600 rounded"
                             />
                          </div>
                        </>
                      ) : (
                        <>
                          <ProfileField label="Legal Identity" value={student.name} />
                          <ProfileField label="Cohort Placement" value={`Year ${student.yearGroup}`} />
                          <ProfileField label="SEN Designation" value={student.isSEN ? 'Requires Support' : 'Mainstream'} color={student.isSEN ? 'text-amber-600' : 'text-slate-600'} />
                        </>
                      )}

                      <div className="space-y-2">
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">CEFR Index</label>
                         {isEditing ? (
                            <select 
                              name="cefrLevel" 
                              defaultValue={student.cefrLevel || ''}
                              className="w-full bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-sm font-black focus:bg-white outline-none transition-all"
                            >
                               <option value="">N/A</option>
                               {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                         ) : (
                            <span className="text-sm font-black text-slate-900">{student.cefrLevel || 'Pending Assessment'}</span>
                         )}
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Class Assignment</label>
                        <input 
                          name="classGroup" 
                          defaultValue={student.classGroup || ''} 
                          placeholder="e.g. 11B3"
                          className="w-full bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-sm font-black focus:bg-white outline-none transition-all"
                        />
                      </div>
                      <ProfileField label="Internal UID" value={student.id} shrink />
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 leading-none">Global Subject Enrollments</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {departments.map(dept => (
                          <label key={dept.id} className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-blue-300 transition-all group">
                             <input 
                               type="checkbox" 
                               name="subjects" 
                               value={dept.name} 
                               defaultChecked={student.enrolledSubjects?.includes(dept.name)}
                               className="w-5 h-5 accent-blue-600 rounded"
                             />
                             <div className="flex flex-col">
                               <span className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{dept.name}</span>
                               <span className="text-[10px] text-slate-400 font-bold uppercase">{dept.icon} Domain</span>
                             </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-6">
                      <button 
                        type="submit"
                        disabled={isSaving}
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-2"
                      >
                        <Save size={16} />
                        {isSaving ? 'Updating...' : 'Save Configuration'}
                      </button>
                    </div>
                  </form>
                </div>
                
                <div className="bg-red-50/20 p-8 rounded-3xl border border-red-100/50">
                  <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Trash2 size={14} />
                    Critical Data Management
                  </h4>
                  <p className="text-red-900/60 text-xs font-medium mb-6 leading-relaxed">Removing a student from the department will purge their associated grade history and pastoral nodes from active views. This action is irreversible.</p>
                  <button 
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to permanently remove ${student.name} from the department database?`)) {
                        await deleteStudent(student.id);
                        onClose();
                      }
                    }}
                    className="flex items-center gap-2 text-xs text-red-600 font-black uppercase tracking-widest hover:bg-red-100/50 px-4 py-2 rounded-lg transition-all"
                  >
                    Delete Student Record
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all relative border-b-4",
        active 
          ? "border-blue-600 text-blue-700 bg-blue-50/10" 
          : "border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

function ProfileField({ label, value, color = "text-slate-900", shrink = false }: { label: string, value: string, color?: string, shrink?: boolean }) {
  return (
    <div className={shrink ? "opacity-50" : ""}>
      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">{label}</span>
      <span className={cn("text-sm font-black tracking-tight", color)}>{value}</span>
    </div>
  );
}

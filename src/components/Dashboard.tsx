import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  BarChart3, 
  Settings, 
  Plus, 
  Search, 
  Filter,
  GraduationCap,
  MessageSquareWarning,
  BarChart,
  LayoutDashboard,
  TrendingDown,
  ChevronRight,
  BookOpen,
  ArrowLeft
} from 'lucide-react';
import { useStudents } from '../hooks/useStudents';
import { Student, Grade, YearGroup } from '../types';
import { 
  addStudent, 
  saveGrade, 
  subscribeToGlobalGrades, 
  subscribeToAllGrades,
  subscribeToAllInterventions,
  seedInitialData,
  subscribeToDepartments,
  addDepartment,
  ensureBaseDepartments
} from '../services/dataService';
import { cn } from '../lib/utils';
import StudentDetailModal from './StudentDetailModal';
import { Intervention, YearGroup as YG } from '../types';

export default function Dashboard() {
  const { students, loading } = useStudents();
  const [departments, setDepartments] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = React.useState('25-26');
  const [selectedDept, setSelectedDept] = React.useState<string | null>(null);
  const [selectedYear, setSelectedYear] = React.useState<string | 'All' | null>('All');
  const [selectedClass, setSelectedClass] = React.useState<string | 'All' | null>(null);
  const [selectedTeacher, setSelectedTeacher] = React.useState<string | 'All'>('All');
  const [showAddStudent, setShowAddStudent] = React.useState(false);
  const [showAddDept, setShowAddDept] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [allGrades, setAllGrades] = React.useState<Grade[]>([]);
  const [allInterventions, setAllInterventions] = React.useState<Intervention[]>([]);

  // Fetch contextual grades, interventions, and departments
  React.useEffect(() => {
    ensureBaseDepartments();
    const unsubDepts = subscribeToDepartments(setDepartments);
    let unsubGrades: (() => void) | undefined;
    if (selectedDept) {
      const deptName = departments.find(d => d.id === selectedDept)?.name || '';
      if (deptName) {
        unsubGrades = subscribeToGlobalGrades(deptName, setAllGrades);
      }
    } else {
      unsubGrades = subscribeToAllGrades(setAllGrades);
    }
    const unsubInterventions = subscribeToAllInterventions(setAllInterventions);
    return () => {
      unsubGrades?.();
      unsubInterventions?.();
      unsubDepts?.();
    };
  }, [selectedDept, departments]);

  const currentDept = departments.find(d => d.id === selectedDept);

  // Derived filter options
  const classes = React.useMemo(() => {
    const s = new Set<string>();
    students.forEach(st => {
      if (st.classGroup) s.add(st.classGroup);
    });
    return Array.from(s).sort();
  }, [students]);

  const teachers = React.useMemo(() => {
    const s = new Set<string>();
    allGrades.forEach(g => {
      if (g.teacherName) s.add(g.teacherName);
    });
    return Array.from(s).sort();
  }, [allGrades]);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === 'All' || s.yearGroup === selectedYear;
    const matchesDept = !selectedDept || s.enrolledSubjects?.includes(currentDept?.name || '');
    const matchesClass = selectedClass === 'All' || s.classGroup === selectedClass;
    
    // Teacher matching is tricky as it's in the grades
    const studentGrades = allGrades.filter(g => 
      g.studentId === s.id && 
      g.academicYear === selectedAcademicYear &&
      (!selectedDept || g.subject === currentDept?.name)
    );
    const matchesTeacher = selectedTeacher === 'All' || studentGrades.some(g => g.teacherName === selectedTeacher);

    return matchesSearch && matchesYear && matchesDept && matchesClass && matchesTeacher;
  });

  const getStudentPGrades = (studentId: string) => {
    const grades = allGrades.filter(g => 
      g.studentId === studentId && 
      g.academicYear === selectedAcademicYear &&
      (!selectedDept || g.subject === currentDept?.name)
    );

    const map: Record<string, Grade> = {};
    grades.forEach(g => map[g.type] = g);
    return map;
  };

  const concerns = React.useMemo(() => {
    return filteredStudents.map(student => {
      const gMap = getStudentPGrades(student.id);
      const points = ['P1', 'P2', 'P3', 'P4'] as const;
      
      // Get the two latest available grades
      const available = points.filter(p => gMap[p]).map(p => gMap[p]);
      if (available.length < 2) return null;

      const latest = available[available.length - 1];
      const previous = available[available.length - 2];

      if (latest.gradeValue < previous.gradeValue) {
        return { 
          student, 
          latest: latest.gradeValue, 
          previous: previous.gradeValue, 
          type: latest.type,
          subject: latest.subject
        };
      }
      return null;
    }).filter(Boolean);
  }, [allGrades, filteredStudents, selectedAcademicYear, selectedDept, currentDept]);

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-800 font-sans overflow-hidden">
      {/* Sidebar - Matching Design HTML */}
      <nav className="w-56 bg-slate-100 border-r border-slate-200 p-4 space-y-6 hidden md:block shrink-0">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Academic Cycle</label>
          <select 
            value={selectedAcademicYear}
            onChange={(e) => setSelectedAcademicYear(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-bold text-blue-700 shadow-sm outline-none"
          >
            <option value="23-24">2023/24</option>
            <option value="24-25">2024/25</option>
            <option value="25-26">2025/26</option>
            <option value="26-27">2026/27</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Perspective</label>
          <div className="space-y-1">
            <button 
              onClick={() => {
                setSelectedDept(null);
                setSelectedYear('All');
                setSelectedClass('All');
              }}
              className={cn(
                "w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors font-medium gap-2",
                !selectedDept ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-slate-200"
              )}
            >
              <Users size={16} /> Student Directory
            </button>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject Domains</label>
            <button 
              onClick={() => setShowAddDept(true)}
              className="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-400"
            >
              <Plus size={10} />
            </button>
          </div>
          <div className="space-y-1">
            {departments.map(dept => (
              <button 
                key={dept.id}
                onClick={() => {
                  setSelectedDept(dept.id);
                  setSelectedYear('All'); // Default to all years for a subject now
                  setSelectedClass('All');
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md transition-colors font-medium",
                  selectedDept === dept.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-slate-200"
                )}
              >
                {dept.icon} {dept.name}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 space-y-2">
          <button 
            onClick={() => setShowAddStudent(true)}
            className="w-full flex items-center px-3 py-2 text-sm rounded-md bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition-colors gap-2"
          >
            <Plus size={16} /> New Enrollment
          </button>
          <button 
            onClick={async () => {
              if (confirm('Deploy demo cohort with 20 students and baseline grades?')) {
                await seedInitialData();
                alert('System initialized with demo data.');
              }
            }}
            className="w-full flex items-center px-3 py-2 text-[10px] rounded-md border border-dashed border-slate-300 text-slate-400 font-black uppercase tracking-widest hover:border-slate-400 hover:text-slate-600 transition-all gap-2"
          >
            <Settings size={12} /> Seed System Data
          </button>
        </div>
      </nav>

      {/* Main Dashboard */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - Matching Design HTML */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Academic GradeMonitor</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Filter cohort..." 
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-md outline-none focus:border-blue-500 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button className="px-4 py-1.5 text-sm font-semibold bg-white rounded shadow-sm text-blue-600">Data Grid</button>
              <button className="px-4 py-1.5 text-sm font-medium text-slate-500">Analytics</button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {!selectedDept ? (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-6"
             >
               <div className="flex items-center justify-between">
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">Student Directory</h2>
                   <p className="text-slate-500 font-medium">Global cohort overview and multi-subject performance tracking.</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Enrollment</span>
                      <span className="text-xl font-black text-slate-900">{students.length}</span>
                    </div>
                    <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex flex-col">
                        <select 
                          value={selectedYear || 'All'}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 bg-transparent border-none outline-none cursor-pointer p-0"
                        >
                          <option value="All">All Year Groups</option>
                          {['7', '8', '9', '10', '11', '12', '13'].map(y => <option key={y} value={y}>Year {y}</option>)}
                        </select>
                        <span className="text-xl font-black text-blue-600">
                          {selectedYear === 'All' ? 'Whole Cohort' : `Year ${selectedYear}`}
                        </span>
                      </div>
                    </div>
                 </div>
               </div>

               {/* Global Concern List */}
               <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                 <div className="flex items-center justify-between mb-6 text-xs">
                   <h3 className="font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <TrendingDown className="text-red-500" size={14} />
                     Priority Interventions (Cross-Department)
                   </h3>
                   <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">{concerns.length} Students At Risk</span>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {concerns.slice(0, 8).map((item: any) => (
                      <div 
                        key={`${item.student.id}-${item.subject}`}
                        onClick={() => setSelectedStudent(item.student)}
                        className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-red-200 transition-all cursor-pointer group"
                      >
                        <p className="text-xs font-black text-slate-900 leading-none mb-1 group-hover:text-red-600">{item.student.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-3">{item.subject} • {item.type}</p>
                        <div className="flex justify-between items-end">
                          <span className="text-[9px] font-black bg-white px-1.5 py-0.5 rounded shadow-sm text-slate-500">Year {item.student.yearGroup}</span>
                          <span className="text-xs font-black text-red-600">{item.previous} → {item.latest}</span>
                        </div>
                      </div>
                    ))}
                    {concerns.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-300 italic text-sm">
                        No performance declines detected across the department.
                      </div>
                    )}
                 </div>
               </div>

               <div>
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Registry</h3>
                   <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{filteredStudents.length} Students Tracked Across All Domains</span>
                 </div>
                 <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-12">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         <th className="px-6 py-4 border-b border-slate-100">Student Name</th>
                         <th className="px-6 py-4 border-b border-slate-100 text-center">Year</th>
                         <th className="px-6 py-4 border-b border-slate-100 text-center">Class</th>
                         <th className="px-6 py-4 border-b border-slate-100 text-center">SEN</th>
                         <th className="px-6 py-4 border-b border-slate-100">Enrolled Subjects</th>
                         <th className="px-6 py-4 border-b border-slate-100 text-center">Portfolio</th>
                       </tr>
                     </thead>
                     <tbody className="text-xs divide-y divide-slate-50">
                       {filteredStudents.slice(0, 50).map(student => (
                         <tr 
                           key={student.id} 
                           onClick={() => setSelectedStudent(student)}
                           className="hover:bg-slate-50 cursor-pointer transition-colors group"
                         >
                           <td className="px-6 py-4 font-black text-slate-900 group-hover:text-blue-600">{student.name}</td>
                           <td className="px-6 py-4 text-center font-bold text-slate-400">Y{student.yearGroup}</td>
                           <td className="px-6 py-4 text-center font-bold text-slate-400">{student.classGroup || '—'}</td>
                           <td className="px-6 py-4 text-center">
                              {student.isSEN ? <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-black text-[9px]">SEN</span> : '—'}
                           </td>
                           <td className="px-6 py-4">
                             <div className="flex flex-wrap gap-1">
                               {student.enrolledSubjects?.map(sub => (
                                 <span key={sub} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[8px] font-bold text-slate-400 uppercase">{sub}</span>
                               ))}
                             </div>
                           </td>
                           <td className="px-6 py-4 text-center">
                             <ChevronRight size={14} className="mx-auto text-slate-300 group-hover:text-blue-600 transition-colors" />
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>

                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Deep Dives</h3>
                   <button 
                    onClick={() => setShowAddDept(true)}
                    className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                   >
                     <Plus size={12} /> New Domain Mapping
                   </button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {departments.map((dept) => (
                     <button 
                       key={dept.id}
                       onClick={() => {
                         setSelectedDept(dept.id);
                         setSelectedYear(null);
                         setSelectedClass(null);
                       }}
                       className="flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-slate-200 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group relative overflow-hidden"
                     >
                       <span className="text-7xl mb-6 group-hover:scale-110 transition-transform relative z-10">{dept.icon}</span>
                       <span className="text-2xl font-black text-slate-900 uppercase tracking-tight relative z-10">{dept.name}</span>
                       <span className="text-sm font-bold text-blue-600 mt-4 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">Launch Subject Dashboard →</span>
                       <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/50 transition-colors" />
                     </button>
                   ))}
                   <button 
                      onClick={() => setShowAddDept(true)}
                      className="flex flex-col items-center justify-center p-10 bg-slate-50 rounded-3xl border border-dashed border-slate-300 hover:border-blue-300 hover:bg-blue-50/20 transition-all group"
                   >
                     <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4 text-slate-300 group-hover:text-blue-500 group-hover:border-blue-200 transition-all">
                       <Plus size={32} />
                     </div>
                     <span className="text-sm font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-700">Map Subject</span>
                   </button>
                 </div>
               </div>
             </motion.div>
          ) : (
            <>
              {/* Top Stats Bar - Matching Design HTML */}
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="Subject Context" value={currentDept?.name || '-'} color="text-blue-600" />
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Year Cohort</span>
                  <select 
                    value={selectedYear || 'All'}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="text-lg font-black text-slate-900 outline-none bg-transparent cursor-pointer"
                  >
                    <option value="All">Whole Cohort</option>
                    {(currentDept?.years || ['7', '8', '9', '10', '11', '12', '13']).map(y => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>
                <StatCard label="Enrolled Students" value={`${filteredStudents.length} Students`} />
                <StatCard label="P-Points Tracked" value={allGrades.filter(g => g.academicYear === selectedAcademicYear && g.subject === currentDept?.name).length.toString()} />
              </div>

              {/* Concern Box */}
              {concerns.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-100 rounded-xl p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-red-700 text-xs font-black uppercase tracking-widest mb-4">
                    <TrendingDown size={16} />
                    Critical Concern List (Recent Drops)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {concerns.map((item: any) => (
                      <div 
                        key={item.student.id}
                        onClick={() => setSelectedStudent(item.student)}
                        className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center cursor-pointer hover:bg-red-50 transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-xs truncate max-w-[100px]">{item.student.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Year {item.student.yearGroup}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{item.type}</p>
                          <p className="text-xs font-black text-red-600">
                             {item.previous} → {item.latest}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Main Table - Matching Design HTML Table Style */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedYear(null)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400">
                        <ArrowLeft size={14} />
                      </button>
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                        {currentDept?.name}: Year {selectedYear}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                       {/* Year 7-9 specific Class Dropdown logic */}
                       {['7', '8', '9'].includes(selectedYear as string) ? (
                         <div className="relative">
                            <select 
                              value={selectedClass || 'All'}
                              onChange={(e) => setSelectedClass(e.target.value)}
                              className="text-[10px] bg-white border border-slate-200 rounded px-3 py-1.5 outline-none font-black text-blue-700 shadow-sm appearance-none pr-8"
                            >
                              <option value="All">All {selectedYear} Classes</option>
                              {[`${selectedYear}A`, `${selectedYear}B`, `${selectedYear}C`, `${selectedYear}D`].map(c => (
                                <option key={c} value={c}>Class {c}</option>
                              ))}
                            </select>
                            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" size={10} />
                         </div>
                       ) : (
                         <select 
                          value={selectedClass || 'All'}
                          onChange={(e) => setSelectedClass(e.target.value)}
                          className="text-[10px] bg-white border border-slate-200 rounded px-2 py-1 outline-none font-bold text-slate-600"
                         >
                           <option value="All">All Groups</option>
                           {classes.filter(c => c.startsWith(selectedYear as string)).map(c => <option key={c} value={c}>Class {c}</option>)}
                         </select>
                       )}
                       
                       <select 
                        value={selectedTeacher}
                        onChange={(e) => setSelectedTeacher(e.target.value)}
                        className="text-[10px] bg-white border border-slate-200 rounded px-2 py-1 outline-none font-bold text-slate-600"
                       >
                         <option value="All">All Teachers</option>
                         {teachers.map(t => <option key={t} value={t}>{t}</option>)}
                       </select>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="px-6 py-4 border-b border-slate-100">Student Name</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-center">Class</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-center">Teacher</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-center">SEN</th>
                        {selectedYear === 'All' && <th className="px-6 py-4 border-b border-slate-100 text-center">Year</th>}
                        <th className="px-4 py-4 border-b border-slate-100 text-center">P1</th>
                        <th className="px-4 py-4 border-b border-slate-100 text-center">P2</th>
                        <th className="px-4 py-4 border-b border-slate-100 text-center">P3</th>
                        <th className="px-4 py-4 border-b border-slate-100 text-center">P4</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-center">Evaluation</th>
                        <th className="px-6 py-4 border-b border-slate-100">Latest Observation</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-slate-600 divide-y divide-slate-50">
                      {filteredStudents.map((student) => {
                        const pGrades = getStudentPGrades(student.id);
                        const points = ['P1', 'P2', 'P3', 'P4'].map(p => pGrades[p]?.gradeValue).filter(Boolean);
                        
                        // Teacher for this specific student in this subject context
                        const contextTeacher = Object.values(pGrades)[0]?.teacherName || student.teacher || '—';

                        // Latest comment for this student
                        const studentInterventions = allInterventions
                          .filter(i => i.studentId === student.id)
                          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                        const latestComment = studentInterventions[0]?.content || '—';

                        const getProgressIcon = () => {
                          if (points.length < 2) return null;
                          const latest = points[points.length - 1];
                          const prev = points[points.length - 2];
                          if (latest > prev) return <span className="flex items-center justify-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-[9px] font-black italic">▲ GAIN</span>;
                          if (latest < prev) return <span className="flex items-center justify-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-[9px] font-black italic">▼ DROP</span>;
                          return <span className="text-slate-300 font-bold tracking-widest text-[9px]">STABLE</span>;
                        };

                        return (
                          <tr 
                            key={student.id} 
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                            onClick={() => setSelectedStudent(student)}
                          >
                            <td className="px-6 py-4 font-bold text-slate-800 group-hover:text-blue-600">
                              {student.name}
                              <p className="text-[10px] text-slate-400 font-medium">CEFR: {student.cefrLevel || '—'}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-black text-slate-400 tracking-tighter">{student.classGroup || '—'}</td>
                            <td className="px-6 py-4 text-center font-bold text-slate-500">{contextTeacher}</td>
                            <td className="px-6 py-4 text-center">
                              {student.isSEN ? <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold text-[9px]">SEN</span> : <span className="text-slate-200">—</span>}
                            </td>
                            {selectedYear === 'All' && <td className="px-6 py-4 text-center uppercase font-bold text-slate-400">Y{student.yearGroup}</td>}
                            <td className="px-4 py-4 text-center font-bold">{pGrades['P1']?.gradeValue || '—'}</td>
                            <td className="px-4 py-4 text-center font-bold">{pGrades['P2']?.gradeValue || '—'}</td>
                            <td className="px-4 py-4 text-center font-bold">{pGrades['P3']?.gradeValue || '—'}</td>
                            <td className="px-4 py-4 text-center font-bold">{pGrades['P4']?.gradeValue || '—'}</td>
                            <td className="px-6 py-4 text-center">
                              {getProgressIcon()}
                            </td>
                            <td className="px-6 py-4 text-slate-400 italic truncate max-w-[200px]">{latestComment}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Selected Student Detail Modal */}
      {/* Department Modal */}
      {showAddDept && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-200">
            <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Map Subject Domain</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const selectedYears = Array.from(formData.getAll('years')) as string[];
              
              if (selectedYears.length === 0) {
                alert('Please select at least one relevant year group.');
                return;
              }

              await addDepartment({
                name: formData.get('name') as string,
                icon: formData.get('icon') as string || '📚',
                color: 'bg-blue-500',
                years: selectedYears
              });
              setShowAddDept(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Subject Title</label>
                  <input name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-medium text-sm" placeholder="e.g. Sociology" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Glyph/Icon</label>
                  <input name="icon" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-medium text-sm" placeholder="e.g. 📊" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 leading-tight">Key Year Groups <span className="text-blue-500">(Required)</span></label>
                  <div className="grid grid-cols-4 gap-2">
                    {['7', '8', '9', '10', '11', '12', '13'].map(year => (
                      <label key={year} className="flex items-center justify-center py-2 bg-slate-50 border border-slate-100 rounded-lg cursor-pointer hover:bg-white transition-all border-slate-200">
                        <input type="checkbox" name="years" value={year} className="hidden peer" />
                        <span className="text-xs font-black text-slate-400 peer-checked:text-blue-600 peer-checked:bg-blue-50 w-full text-center h-full flex items-center justify-center rounded-lg transition-all uppercase">{year}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button type="submit" className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all">Enable Mapping</button>
                <button type="button" onClick={() => setShowAddDept(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all">Discard</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedStudent && (
        <StudentDetailModal 
          student={selectedStudent} 
          academicYear={selectedAcademicYear}
          onClose={() => setSelectedStudent(null)} 
        />
      )}

      {/* Add Student Modal Container */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-200">
            <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">New Student Onboarding</h3>
            <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const selectedSubjects = Array.from(formData.getAll('subjects')) as string[];
                await addStudent({
                  name: formData.get('name') as string,
                  yearGroup: formData.get('yearGroup') as any,
                  classGroup: formData.get('classGroup') as string,
                  teacher: formData.get('teacher') as string,
                  enrolledSubjects: selectedSubjects,
                  isSEN: formData.get('isSEN') === 'true',
                  cefrLevel: (formData.get('cefr') as any) || 'A1'
                });
                setShowAddStudent(false);
              }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Student Identity</label>
                  <input name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-medium text-sm" placeholder="Full Name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cohort</label>
                    <select name="yearGroup" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none font-medium text-sm">
                      {['7', '8', '9', '10', '11', '12', '13'].map(y => (
                        <option key={y} value={y}>Year {y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Class Group</label>
                    <input name="classGroup" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-medium text-sm" placeholder="e.g. 10A2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Lead Teacher / Tutor</label>
                  <input name="teacher" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-medium text-sm" placeholder="e.g. Mr. Smith" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Subject Enrolments</label>
                  <div className="grid grid-cols-2 gap-2">
                    {departments.map(dept => (
                      <label key={dept.id} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-lg cursor-pointer hover:bg-white transition-colors">
                        <input type="checkbox" name="subjects" value={dept.name} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{dept.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <input type="checkbox" name="isSEN" value="true" className="w-5 h-5 accent-blue-600" />
                   <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">SEN / Strategic Intervention</span>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setShowAddStudent(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">Add Student</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button 
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium",
        active 
          ? "bg-white text-blue-700 shadow-sm" 
          : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function YearPill({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-5 py-1.5 rounded-md text-xs font-bold transition-all",
        active 
          ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
          : "bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600"
      )}
    >
      {label}
    </button>
  );
}

function StudentCard({ student, index, onClick }: { student: Student, index: number, onClick: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all group cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
          {student.name.split(' ').map(n => n.charAt(0)).join('')}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Year {student.yearGroup}</span>
          {student.isSEN && <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded mt-1">SEN</span>}
        </div>
      </div>
      
      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate text-sm">{student.name}</h3>
      <p className="text-[10px] text-slate-400 mb-4 font-bold uppercase tracking-tighter">CEFR: {student.cefrLevel || 'Not Set'}</p>

      <div className="space-y-1.5 pt-3 border-t border-slate-50">
        <GradePreview label="P1 Benchmark" value="Pending" />
        <GradePreview label="Current Forecast" value="8" />
      </div>
    </motion.div>
  );
}

function GradePreview({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold text-slate-700">{value}</span>
    </div>
  );
}

function StatCard({ label, value, color = "text-slate-900" }: { label: string, value: string, color?: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
      <span className={cn("text-xl font-black tracking-tight", color)}>{value}</span>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, GraduationCap, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Types for our data structure
interface Student {
  id: string;
  name: string;
  sen: boolean;
  cefr: string;
  teacher: string;
  grades: { p1: number; p2: number; p3: number; p4: number };
  comments: string;
}

const subjectsByYear = {
  "History": ["9", "10", "11", "12", "13"],
  "Geography": ["9", "10", "11", "12", "13"],
  "Psychology": ["10", "11", "12", "13"],
  "Sociology": ["10", "11"],
  "Philosophy": ["12", "13"],
  "Social Studies": ["7", "8"]
};

export default function GradeTracker() {
  const [years, setYears] = useState(["25-26", "26-27"]);
  const [activeYear, setActiveYear] = useState("25-26");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedYearGroup, setSelectedYearGroup] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  
  // Mock data - In the future, this would fetch from your Firebase
  const [students, setStudents] = useState<Student[]>([
    { id: '1', name: 'John Doe', sen: false, cefr: 'B2', teacher: 'Smith', grades: { p1: 75, p2: 80, p3: 78, p4: 0 }, comments: '' }
  ]);

  const calculateTrend = (g: { p1: number; p2: number; p3: number; p4: number }) => {
    const activeGrades = [g.p1, g.p2, g.p3, g.p4].filter(v => v > 0);
    if (activeGrades.length < 2) return <Minus className="text-gray-400" />;
    
    const last = activeGrades[activeGrades.length - 1];
    const prev = activeGrades[activeGrades.length - 2];
    
    if (last > prev) return <TrendingUp className="text-green-500" />;
    if (last < prev) return <TrendingDown className="text-red-500" />;
    return <Minus className="text-yellow-500" />;
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-6">
        <div className="flex items-center gap-2 mb-8">
          <GraduationCap className="text-blue-400" />
          <h1 className="text-xl font-bold tracking-tight">Staff Portal</h1>
        </div>

        <div className="mb-6">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Academic Year</label>
          <div className="flex gap-2 mt-2">
            <select 
              value={activeYear} 
              onChange={(e) => setActiveYear(e.target.value)}
              className="bg-slate-800 border-none rounded px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="p-2 bg-blue-600 rounded hover:bg-blue-500 transition">
              <Plus size={18} />
            </button>
          </div>
        </div>

        <nav className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subjects</label>
          {Object.keys(subjectsByYear).map(sub => (
            <button
              key={sub}
              onClick={() => { setSelectedSubject(sub); setSelectedYearGroup(""); }}
              className={`w-full text-left px-3 py-2 rounded text-sm transition ${selectedSubject === sub ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              {sub}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-8 py-4 flex items-center gap-4">
          <span className="text-gray-400">{activeYear}</span>
          <ChevronRight size={16} className="text-gray-300" />
          <span className="font-semibold text-gray-800">{selectedSubject || "Select Subject"}</span>
        </header>

        <div className="p-8 overflow-auto">
          {selectedSubject ? (
            <div className="space-y-6">
              {/* Year Group & Class Selectors */}
              <div className="flex gap-4">
                <select 
                  className="p-2 border rounded shadow-sm bg-white"
                  value={selectedYearGroup}
                  onChange={(e) => setSelectedYearGroup(e.target.value)}
                >
                  <option value="">Year Group</option>
                  {subjectsByYear[selectedSubject as keyof typeof subjectsByYear].map(y => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>

                <select className="p-2 border rounded shadow-sm bg-white" onChange={(e) => setSelectedClass(e.target.value)}>
                  <option value="">Select Class</option>
                  <option value="A">Class A</option>
                  <option value="B">Class B</option>
                  <option value="SL">12.1 SL</option>
                </select>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">SEN/CEFR</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Teacher</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">P1</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">P2</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">P3</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">P4</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Trend</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Interventions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id} className="border-b hover:bg-blue-50/50 transition">
                        <td className="px-4 py-4 font-medium text-gray-900">{s.name}</td>
                        <td className="px-4 py-4">
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded mr-2">{s.sen ? 'SEN' : 'Gen'}</span>
                          <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">{s.cefr}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{s.teacher}</td>
                        {['p1', 'p2', 'p3', 'p4'].map(p => (
                          <td key={p} className="px-2 py-4">
                            <input 
                              type="number" 
                              className="w-16 p-1 border rounded text-center focus:ring-1 focus:ring-blue-500"
                              defaultValue={s.grades[p as keyof typeof s.grades]}
                            />
                          </td>
                        ))}
                        <td className="px-4 py-4">{calculateTrend(s.grades)}</td>
                        <td className="px-4 py-4">
                          <textarea 
                            className="w-full text-xs p-2 border rounded bg-gray-50"
                            placeholder="Add comment..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <GraduationCap size={48} className="mb-4 opacity-20" />
              <p>Select a subject from the sidebar to begin tracking.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

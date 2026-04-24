import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, auth } from '../firebase';
import { Student, Grade, Intervention, YearGroup, GradeType } from '../types';

export function subscribeToStudents(callback: (students: Student[]) => void) {
  const q = query(collection(db, 'students'), orderBy('name'));
  return onSnapshot(q, 
    (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      callback(students);
    },
    (err) => handleFirestoreError(err, 'list', 'students')
  );
}

export function subscribeToStudentGrades(studentId: string, callback: (grades: Grade[]) => void) {
  const q = query(collection(db, 'students', studentId, 'grades'), orderBy('updatedAt', 'desc'));
  return onSnapshot(q,
    (snapshot) => {
      const grades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
      callback(grades);
    },
    (err) => handleFirestoreError(err, 'list', `students/${studentId}/grades`)
  );
}

export function subscribeToInterventions(studentId: string, callback: (interventions: Intervention[]) => void) {
  const q = query(collection(db, 'students', studentId, 'interventions'), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    (snapshot) => {
      const interventions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Intervention));
      callback(interventions);
    },
    (err) => handleFirestoreError(err, 'list', `students/${studentId}/interventions`)
  );
}

export async function addStudent(studentData: Omit<Student, 'id' | 'updatedAt'>) {
  try {
    const studentRef = await addDoc(collection(db, 'students'), {
      ...studentData,
      updatedAt: serverTimestamp()
    });
    return studentRef.id;
  } catch (err) {
    handleFirestoreError(err, 'create', 'students');
  }
}

export async function updateStudent(studentId: string, studentData: Partial<Student>) {
  try {
    const studentRef = doc(db, 'students', studentId);
    await updateDoc(studentRef, {
      ...studentData,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, 'update', `students/${studentId}`);
  }
}

export async function saveGrade(gradeData: Omit<Grade, 'id' | 'updatedAt' | 'updatedBy'>) {
  try {
    const user = auth.currentUser;
    const gradePayload = {
      ...gradeData,
      updatedAt: serverTimestamp(),
      updatedBy: user?.displayName || user?.email || 'Unknown Staff'
    };

    // Save in student's subcollection
    const studentGradeRef = doc(collection(db, 'students', gradeData.studentId, 'grades'));
    await setDoc(studentGradeRef, gradePayload);

    // Denormalize to global collection for analysis
    const globalGradeRef = doc(db, 'globalGrades', studentGradeRef.id);
    await setDoc(globalGradeRef, gradePayload);

    return studentGradeRef.id;
  } catch (err) {
    handleFirestoreError(err, 'write', 'grades');
  }
}

export function subscribeToAllInterventions(callback: (interventions: Intervention[]) => void) {
  const q = collection(db, 'globalInterventions'); // We'll need to denormalize these too for global view
  return onSnapshot(q,
    (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Intervention));
      callback(data);
    },
    (err) => handleFirestoreError(err, 'list', 'globalInterventions')
  );
}

// Update addIntervention to denormalize
export async function addIntervention(interventionData: Omit<Intervention, 'id' | 'authorId' | 'authorName' | 'createdAt'>) {
  try {
    const user = auth.currentUser;
    const interventionPayload = {
      ...interventionData,
      authorId: user?.uid || 'guest',
      authorName: user?.displayName || user?.email || 'Staff Member',
      createdAt: serverTimestamp()
    };
    
    const interventionRef = await addDoc(collection(db, 'students', interventionData.studentId, 'interventions'), interventionPayload);
    
    // Denormalize
    await setDoc(doc(db, 'globalInterventions', interventionRef.id), interventionPayload);
    
    return interventionRef.id;
  } catch (err) {
    handleFirestoreError(err, 'create', `students/${interventionData.studentId}/interventions`);
  }
}

export async function deleteStudent(studentId: string) {
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (err) {
    handleFirestoreError(err, 'delete', `students/${studentId}`);
  }
}

export function subscribeToAllGrades(callback: (grades: Grade[]) => void) {
  const q = collection(db, 'globalGrades');
  return onSnapshot(q,
    (snapshot) => {
      const gradesData: Grade[] = [];
      snapshot.forEach((doc) => {
        gradesData.push({ id: doc.id, ...doc.data() } as Grade);
      });
      callback(gradesData);
    },
    (error) => handleFirestoreError(error, 'list', 'globalGrades')
  );
}

export function subscribeToGlobalGrades(subject: string, callback: (grades: Grade[]) => void) {
  const q = query(collection(db, 'globalGrades'), where('subject', '==', subject));
  return onSnapshot(q,
    (snapshot) => {
      const grades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
      callback(grades);
    },
    (err) => handleFirestoreError(err, 'list', 'globalGrades')
  );
}

export async function bulkAddStudents(studentsData: Omit<Student, 'id' | 'updatedAt'>[]) {
  try {
    const batch = writeBatch(db);
    for (const data of studentsData) {
      const studentRef = doc(collection(db, 'students'));
      batch.set(studentRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, 'write', 'students');
  }
}

export async function updateStudentEnrollment(studentId: string, enrolledSubjects: string[], classGroup?: string) {
  try {
    const studentRef = doc(db, 'students', studentId);
    await updateDoc(studentRef, {
      enrolledSubjects,
      classGroup,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, 'update', `students/${studentId}`);
  }
}

export async function addDepartment(dept: { name: string, icon: string, color: string, years: string[] }) {
  try {
    const id = dept.name.toLowerCase().replace(/ /g, '-');
    const deptRef = doc(db, 'departments', id);
    await setDoc(deptRef, {
      ...dept,
      id,
      updatedAt: serverTimestamp()
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, 'create', 'departments');
  }
}

export function subscribeToDepartments(callback: (depts: any[]) => void) {
  const q = collection(db, 'departments');
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
  });
}
export async function ensureBaseDepartments() {
  try {
    const q = collection(db, 'departments');
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      const subjectDefinitions = [
        { name: 'History', years: ['9', '10', '11', '12', '13'], icon: '📜' },
        { name: 'Geography', years: ['9', '10', '11', '12', '13'], icon: '🌍' },
        { name: 'Psychology', years: ['10', '11', '12', '13'], icon: '🧠' },
        { name: 'Philosophy', years: ['12', '13'], icon: '⚖️' },
        { name: 'Sociology', years: ['10', '11'], icon: '👥' },
        { name: 'Social Studies', years: ['7', '8'], icon: '🤝' },
      ];
      for (const s of subjectDefinitions) {
        await addDepartment({
          name: s.name,
          icon: s.icon,
          color: 'bg-blue-600',
          years: s.years
        });
      }
    }
  } catch (err) {
    console.error('Error ensuring base departments:', err);
  }
}

export async function seedInitialData() {
  try {
    const subjectDefinitions = [
      { name: 'History', years: ['9', '10', '11', '12', '13'], icon: '📜' },
      { name: 'Geography', years: ['9', '10', '11', '12', '13'], icon: '🌍' },
      { name: 'Psychology', years: ['10', '11', '12', '13'], icon: '🧠' },
      { name: 'Philosophy', years: ['12', '13'], icon: '⚖️' },
      { name: 'Sociology', years: ['10', '11'], icon: '👥' },
      { name: 'Social Studies', years: ['7', '8'], icon: '🤝' },
    ];

    const yearGroups: YearGroup[] = ['7', '8', '9', '10', '11', '12', '13'];

    // Seed departments correctly
    for (const s of subjectDefinitions) {
      await addDepartment({
        name: s.name,
        icon: s.icon,
        color: 'bg-blue-600',
        years: s.years
      });
    }

    const names = [
      'Alice Thompson', 'Bob Miller', 'Charlie Davis', 'Diana Prince', 'Edward Norton',
      'Fiona Gallagher', 'George Clooney', 'Hannah Abbott', 'Ian McKellen', 'Jack Sparrow',
      'Katherine Pierce', 'Liam Neeson', 'Mia Wallace', 'Noah Centineo', 'Olivia Wilde',
      'Peter Parker', 'Quentin Tarantino', 'Riley Reid', 'Samuel Jackson', 'Taylor Swift'
    ];

    const batch = writeBatch(db);
    const user = auth.currentUser;
    const authorName = user?.displayName || user?.email || 'System Seed';
    const teachers = ['Mr. Smith', 'Ms. Jones', 'Dr. Brown', 'Mrs. White'];

    for (let i = 0; i < names.length; i++) {
      const studentRef = doc(collection(db, 'students'));
      const studentId = studentRef.id;
      const year = yearGroups[Math.floor(Math.random() * yearGroups.length)];
      
      // Only enroll in subjects allowed for this year
      const eligibleSubjects = subjectDefinitions.filter(s => s.years.includes(year));
      const studentSubjects = eligibleSubjects
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(eligibleSubjects.length, 2))
        .map(s => s.name);

      const classGroup = `${year}${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`;

      batch.set(studentRef, {
        name: names[i],
        yearGroup: year,
        classGroup,
        teacher: teachers[Math.floor(Math.random() * teachers.length)],
        enrolledSubjects: studentSubjects,
        isSEN: Math.random() > 0.8,
        cefrLevel: ['B1', 'B2', 'C1'][Math.floor(Math.random() * 3)] as any,
        updatedAt: serverTimestamp()
      });

      for (const yr of ['24-25', '25-26']) {
        for (const subject of studentSubjects) {
          const types: GradeType[] = ['P1', 'P2', 'P3', 'P4'];
          let baseGrade = 3 + Math.floor(Math.random() * 5);
          
          for (let j = 0; j < types.length; j++) {
            const type = types[j];
            const gradeId = `${studentId}_${subject}_${yr}_${type}`.replace(/ /g, '_');
            const drift = Math.random() > 0.7 ? -1 : Math.random() > 0.4 ? 1 : 0;
            baseGrade = Math.max(1, Math.min(9, baseGrade + drift));

            const gradePayload = {
              studentId,
              subject,
              academicYear: yr,
              type,
              gradeValue: baseGrade.toString(),
              teacherName: teachers[Math.floor(Math.random() * teachers.length)],
              updatedAt: serverTimestamp(),
              updatedBy: authorName
            };
            
            batch.set(doc(db, 'students', studentId, 'grades', gradeId), gradePayload);
            batch.set(doc(db, 'globalGrades', gradeId), gradePayload);
          }
        }
      }

      const interventionRef = doc(collection(db, 'students', studentId, 'interventions'));
      const interventionPayload = {
        studentId,
        authorId: user?.uid || 'system',
        authorName,
        category: 'General',
        content: `Initial baseline observation for ${names[i]}. Student showing engagement in class.`,
        createdAt: serverTimestamp()
      };
      batch.set(interventionRef, interventionPayload);
      batch.set(doc(db, 'globalInterventions', interventionRef.id), interventionPayload);
    }

    await batch.commit();
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  }
}

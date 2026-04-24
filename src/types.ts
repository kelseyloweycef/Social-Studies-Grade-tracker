import { Timestamp } from 'firebase/firestore';

export type YearGroup = '7' | '8' | '9' | '10' | '11' | '12' | '13';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type InterventionCategory = 'Concern' | 'Support' | 'Intervention' | 'General';
export type GradeType = 'P1' | 'P2' | 'P3' | 'P4' | 'Aspirational';

export interface Student {
  id: string;
  name: string;
  yearGroup: YearGroup;
  classGroup?: string;
  teacher?: string; // House/Form tutor or local context
  enrolledSubjects?: string[];
  isSEN: boolean;
  cefrLevel?: CEFRLevel;
  updatedAt: Timestamp;
}

export interface Grade {
  id: string;
  studentId: string;
  subject: string;
  academicYear: string;
  type: GradeType;
  gradeValue: string;
  teacherName?: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface Intervention {
  id: string;
  studentId: string;
  authorId: string;
  authorName: string;
  category: InterventionCategory;
  content: string;
  createdAt: Timestamp;
}

export interface DepartmentStats {
  subject: string;
  averageGrade: string;
  studentsCount: number;
  yearGroups: Record<YearGroup, number>;
}

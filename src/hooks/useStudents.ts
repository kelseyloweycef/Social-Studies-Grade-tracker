import { useState, useEffect } from 'react';
import { subscribeToStudents } from '../services/dataService';
import { Student } from '../types';

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToStudents((data) => {
      setStudents(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { students, loading };
}

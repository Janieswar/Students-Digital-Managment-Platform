
import { useState, useCallback } from 'react';
import { 
  MOCK_FACULTY_SECTIONS, 
  MOCK_ANNOUNCEMENTS, 
  MOCK_MATERIALS, 
  MOCK_GRADES,
  Section,
  Announcement,
  CourseMaterial,
  GradeEntry,
  Student
} from './faculty-mock-data';

export function useFacultyState() {
  const [sections, setSections] = useState<Section[]>(MOCK_FACULTY_SECTIONS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);
  const [materials, setMaterials] = useState<CourseMaterial[]>(MOCK_MATERIALS);
  const [grades, setGrades] = useState<GradeEntry[]>(MOCK_GRADES);

  // Grade CRUD
  const addGrade = useCallback((newGrade: Omit<GradeEntry, 'id'>) => {
    const grade: GradeEntry = {
      ...newGrade,
      id: `gr-${Date.now()}`
    };
    setGrades(prev => [...prev, grade]);
  }, []);

  const updateGrade = useCallback((id: string, updates: Partial<GradeEntry>) => {
    setGrades(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, []);

  const deleteGrade = useCallback((id: string) => {
    setGrades(prev => prev.filter(g => g.id !== id));
  }, []);

  // Attendance CRUD (Update student attendance and at-risk status)
  const updateAttendance = useCallback((sectionId: string, studentId: string, status: 'present' | 'absent' | 'late') => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        students: section.students.map(student => {
          if (student.id !== studentId) return student;
          
          let newAttendance = student.attendance;
          if (status === 'present') newAttendance = Math.min(100, student.attendance + 1);
          if (status === 'absent') newAttendance = Math.max(0, student.attendance - 2);
          
          return {
            ...student,
            attendance: newAttendance,
            at_risk: newAttendance < 75
          };
        })
      };
    }));
  }, []);

  // Announcement CRUD
  const addAnnouncement = useCallback((title: string, content: string, status: 'draft' | 'published') => {
    const ann: Announcement = {
      id: `ann-${Date.now()}`,
      title,
      content,
      status,
      date: new Date().toISOString().split('T')[0]
    };
    setAnnouncements(prev => [ann, ...prev]);
  }, []);

  const updateAnnouncement = useCallback((id: string, updates: Partial<Announcement>) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteAnnouncement = useCallback((id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  }, []);

  // Course Material CRUD
  const addMaterial = useCallback((title: string, type: CourseMaterial['type']) => {
    const mat: CourseMaterial = {
      id: `mat-${Date.now()}`,
      title,
      type,
      size: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
      uploadedAt: new Date().toISOString().split('T')[0]
    };
    setMaterials(prev => [mat, ...prev]);
  }, []);

  const deleteMaterial = useCallback((id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  }, []);

  return {
    sections,
    announcements,
    materials,
    grades,
    addGrade,
    updateGrade,
    deleteGrade,
    updateAttendance,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    addMaterial,
    deleteMaterial
  };
}

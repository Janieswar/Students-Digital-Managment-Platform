
export interface Student {
  id: string;
  name: string;
  usn: string;
  attendance: number;
  grade?: string;
  internal_notes?: string;
  at_risk?: boolean;
}

export interface Section {
  id: string;
  name: string;
  semester: number;
  department_code: string;
  subject: string;
  time: string;
  room: string;
  students: Student[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  date: string;
}

export interface CourseMaterial {
  id: string;
  title: string;
  type: 'pdf' | 'doc' | 'zip' | 'ppt' | 'link';
  size?: string;
  uploadedAt: string;
}

export interface GradeEntry {
  id: string;
  studentId: string;
  studentName: string;
  usn: string;
  marks: string;
  maxMarks: string;
  internalNotes: string;
  isLocked: boolean;
}

export const MOCK_FACULTY_SECTIONS: Section[] = [
  {
    id: 'sec-1',
    name: 'A',
    semester: 4,
    department_code: 'CSE',
    subject: 'Data Structures and Algorithms',
    time: '09:00 AM - 10:00 AM',
    room: 'CR-301',
    students: [
      { id: 'st-1', name: 'John Doe', usn: '1CE22CS001', attendance: 82, at_risk: false },
      { id: 'st-2', name: 'Jane Smith', usn: '1CE22CS002', attendance: 72, at_risk: true },
      { id: 'st-3', name: 'Bob Wilson', usn: '1CE22CS003', attendance: 65, at_risk: true },
      { id: 'st-4', name: 'Alice Brown', usn: '1CE22CS004', attendance: 91, at_risk: false },
      { id: 'st-5', name: 'Charlie Davis', usn: '1CE22CS005', attendance: 78, at_risk: false },
    ],
  },
  {
    id: 'sec-2',
    name: 'B',
    semester: 4,
    department_code: 'CSE',
    subject: 'Computer Organization',
    time: '11:15 AM - 12:15 PM',
    room: 'CR-302',
    students: [
      { id: 'st-6', name: 'David Lee', usn: '1CE22CS045', attendance: 88, at_risk: false },
      { id: 'st-7', name: 'Emma White', usn: '1CE22CS046', attendance: 74, at_risk: true },
    ],
  },
  {
    id: 'sec-3',
    name: 'A',
    semester: 6,
    department_code: 'CSE',
    subject: 'Cloud Computing',
    time: '02:00 PM - 03:00 PM',
    room: 'Lab-104',
    students: [
      { id: 'st-8', name: 'Frank Miller', usn: '1CE21CS012', attendance: 95, at_risk: false },
    ],
  },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Mid-term Exam Schedule',
    content: 'The mid-term exams for 4th semester DSA will start from March 25th.',
    status: 'published',
    date: '2026-03-10',
  },
  {
    id: 'ann-2',
    title: 'New Study Materials uploaded',
    content: 'Check the resources section for Unit 3 notes.',
    status: 'draft',
    date: '2026-03-14',
  },
];

export const MOCK_MATERIALS: CourseMaterial[] = [
  { id: 'mat-1', title: 'Unit 1: Linked Lists', type: 'pdf', size: '2.4 MB', uploadedAt: '2026-03-01' },
  { id: 'mat-2', title: 'Algorithm Complexity Chart', type: 'ppt', size: '5.1 MB', uploadedAt: '2026-03-05' },
  { id: 'mat-3', title: 'Lab 5 Skeleton Code', type: 'zip', size: '1.2 MB', uploadedAt: '2026-03-12' },
];

export const MOCK_GRADES: GradeEntry[] = [
  { id: 'gr-1', studentId: 'st-1', studentName: 'John Doe', usn: '1CE22CS001', marks: '45', maxMarks: '50', internalNotes: 'Excellent performance in lab tests.', isLocked: false },
  { id: 'gr-2', studentId: 'st-2', studentName: 'Jane Smith', usn: '1CE22CS002', marks: '32', maxMarks: '50', internalNotes: 'Needs focus on time complexity analysis.', isLocked: true },
  { id: 'gr-3', studentId: 'st-3', studentName: 'Bob Wilson', usn: '1CE22CS003', marks: '28', maxMarks: '50', internalNotes: 'Consistently late with submissions.', isLocked: false },
];

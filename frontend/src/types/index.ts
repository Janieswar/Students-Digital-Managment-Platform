export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "faculty" | "student";
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  student_profile?: StudentProfile;
  faculty_profile?: FacultyProfile;
}

export interface StudentProfile {
  usn: string;
  department: Department;
  section: Section;
  current_semester: number;
  academic_year: string;
}

export interface FacultyProfile {
  employee_id: string;
  department: Department;
  assigned_sections: SectionAssignment[];
}

export interface Department {
  id: string;
  code: string;
  name: string;
}

export interface Section {
  id: string;
  name: string;
  semester: number;
  academic_year: string;
  department_id: string;
}

export interface SectionAssignment {
  section_id: string;
  name: string;
  semester: number;
  department_code: string;
  subject: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

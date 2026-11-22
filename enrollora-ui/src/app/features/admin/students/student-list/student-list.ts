
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { StudentService } from '../student.service';
import { StudentResponse, StudentFilter, UpdateStudentRequest } from '../student.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { RegisterStudentRequest } from '../../../../core/auth/auth.models';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, ReactiveFormsModule],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css',
})
export class StudentList implements OnInit {
  private studentService = inject(StudentService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  students: StudentResponse[] = [];

  isLoading = false;
  errorMessage = '';

  pageNumber = 1;
  pageSize = 5;
  totalRecords = 0;
  totalPages = 0;

  selectedStudent: StudentResponse | null = null;
  isDetailsLoading = false;
  detailsError = '';

  // Add Student
  isAddModalOpen = false;
  isAddingStudent = false;
  addSuccessMessage = '';
  addErrorMessage = '';

  addStudentForm = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.maxLength(120)
    ]),
    email: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(256)
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(8)
    ]),
    department: new FormControl('', [
      Validators.required,
      Validators.maxLength(100)
    ]),
    age: new FormControl(18, [
      Validators.required,
      Validators.min(17),
      Validators.max(60)
    ]),
    cgpa: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(10)
    ]),
  });

  filters: StudentFilter = {
    search: '',
    status: null,
    department: '',
    minAge: null,
    maxAge: null,
    minCgpa: null,
    maxCgpa: null,
  };

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentService.getStudents(this.pageNumber, this.pageSize, this.filters).subscribe({
      next: (response) => {
        this.students = response.items;
        this.totalRecords = response.totalRecords;
        this.totalPages = response.totalPages;
        this.pageNumber = response.pageNumber;
        this.pageSize = response.pageSize;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load students:', error);
        this.errorMessage = 'Unable to load students.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // Open Add Student Modal
  openAddStudentModal(): void {
    this.addStudentForm.reset({
      name: '',
      email: '',
      password: '',
      department: '',
      age: 18,
      cgpa: 0,
    });

    this.addSuccessMessage = '';
    this.addErrorMessage = '';
    this.isAddModalOpen = true;
  }

  // Close Add Student Modal
  closeAddStudentModal(): void {
    if (this.isAddingStudent) {
      return;
    }

    this.isAddModalOpen = false;
    this.addSuccessMessage = '';
    this.addErrorMessage = '';
  }

  // Save New Student
  addStudent(): void {
    if (this.addStudentForm.invalid || this.isAddingStudent) {
      this.addStudentForm.markAllAsTouched();
      return;
    }

    const formValue = this.addStudentForm.getRawValue();

    const request: RegisterStudentRequest = {
      name: formValue.name!.trim(),
      email: formValue.email!.trim(),
      password: formValue.password!,
      department: formValue.department!.trim(),
      age: Number(formValue.age),
      cgpa: Number(formValue.cgpa),
    };

    this.isAddingStudent = true;
    this.addErrorMessage = '';
    this.addSuccessMessage = '';

    this.authService.register(request).subscribe({
      next: (response) => {
        this.isAddingStudent = false;
        this.addSuccessMessage = response.message;

        this.pageNumber = 1;
        this.isAddModalOpen = false;

        this.loadStudents();
        this.cdr.markForCheck();

        alert(response.message);
      },
      error: (error) => {
        console.error('Failed to add student:', error);

        this.isAddingStudent = false;

        if (error.status === 409) {
          this.addErrorMessage = 'An account with this email already exists.';
        } else if (error.status === 400) {
          this.addErrorMessage =
            error.error?.detail ||
            error.error?.message ||
            'Please check the entered student details.';
        } else {
          this.addErrorMessage =
            error.error?.detail ||
            error.error?.message ||
            'Unable to add student. Please try again.';
        }

        this.cdr.markForCheck();
      },
    });
  }

  approveStudent(id: number): void {
    if (!confirm('Are you sure you want to approve this student?')) {
      return;
    }

    this.studentService.approveStudent(id).subscribe({
      next: (response) => {
        alert(response.message);
        this.loadStudents();
      },
      error: (error) => {
        console.error(error);
        alert('Unable to approve student.');
      },
    });
  }

  rejectStudent(id: number): void {
    if (!confirm('Are you sure you want to reject this student?')) {
      return;
    }

    this.studentService.rejectStudent(id).subscribe({
      next: (response) => {
        alert(response.message);
        this.loadStudents();
      },
      error: (error) => {
        console.error(error);
        alert('Unable to reject student.');
      },
    });
  }

  goToPreviousPage(): void {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadStudents();
    }
  }

  goToNextPage(): void {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadStudents();
    }
  }

  changePageSize(size: string): void {
    this.pageSize = Number(size);
    this.pageNumber = 1;
    this.loadStudents();
  }

  applyFilters(): void {
    this.pageNumber = 1;
    this.loadStudents();
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      status: null,
      department: '',
      minAge: null,
      maxAge: null,
      minCgpa: null,
      maxCgpa: null,
    };

    this.pageNumber = 1;
    this.loadStudents();
  }

  viewStudent(id: number): void {
    this.selectedStudent = null;
    this.isDetailsLoading = true;
    this.detailsError = '';

    this.studentService.getStudentById(id).subscribe({
      next: (student) => {
        this.selectedStudent = student;
        this.isDetailsLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load student details:', error);
        this.detailsError = 'Unable to load student details.';
        this.isDetailsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  isEditModalOpen = false;
  editingStudentId: number | null = null;

  studentForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    department: new FormControl('', Validators.required),
    age: new FormControl(18, [Validators.required, Validators.min(17), Validators.max(60)]),
    cgpa: new FormControl(0, [Validators.required, Validators.min(0), Validators.max(10)]),
  });

  editStudent(id: number): void {
    this.editingStudentId = id;
    this.isEditModalOpen = true;

    this.studentService.getStudentById(id).subscribe({
      next: (student) => {
        this.studentForm.patchValue({
          name: student.name,
          email: student.email,
          department: student.department,
          age: student.age,
          cgpa: student.cgpa,
        });
      },
      error: (error) => {
        console.error('Failed to load student details', error);
      },
    });
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editingStudentId = null;
    this.studentForm.reset({
      name: '',
      email: '',
      department: '',
      age: 18,
      cgpa: 0,
    });
  }

  updateStudent(): void {
    if (this.studentForm.invalid || this.editingStudentId === null) {
      return;
    }

    const formValue = this.studentForm.getRawValue();

    const studentData: UpdateStudentRequest = {
      name: formValue.name!,
      email: formValue.email!,
      department: formValue.department!,
      age: formValue.age!,
      cgpa: formValue.cgpa!,
    };

    this.studentService.updateStudent(this.editingStudentId, studentData).subscribe({
      next: (updatedStudent) => {
        console.log('Student updated:', updatedStudent);
        this.closeEditModal();
        this.loadStudents();
      },
      error: (error) => {
        console.error('Failed to update student:', error);
      },
    });
  }

  deleteStudent(id: number): void {
    if (!confirm('Are you sure you want to delete this student?')) {
      return;
    }

    this.studentService.deleteStudent(id).subscribe({
      next: () => {
        this.loadStudents();
      },
      error: (error) => {
        console.error('Failed to delete student:', error);
      },
    });
  }
}

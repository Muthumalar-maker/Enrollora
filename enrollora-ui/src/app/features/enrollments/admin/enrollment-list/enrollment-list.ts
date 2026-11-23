
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EnrollmentService } from '../../enrollment.service';
import {
  EnrollmentResponse,
  EnrollmentFilter,
} from '../../enrollment.models';

import { CourseService } from '../../../admin/courses/course.service';
import { CourseResponse } from '../../../admin/courses/course.models';

import { StudentService } from '../../../admin/students/student.service';
import { StudentResponse } from '../../../admin/students/student.models';

@Component({
  selector: 'app-enrollment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enrollment-list.html',
  styleUrl: './enrollment-list.css',
})
export class EnrollmentListComponent implements OnInit {
  private enrollmentService = inject(EnrollmentService);
  private courseService = inject(CourseService);
  private studentService = inject(StudentService);

  enrollments = signal<EnrollmentResponse[]>([]);
  courses = signal<CourseResponse[]>([]);
  approvedStudents = signal<StudentResponse[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Admin enrollment form
  isEnrollModalOpen = signal(false);
  selectedStudentId = signal<number | null>(null);
  selectedCourseId = signal<number | null>(null);
  isSubmitting = signal(false);
  formErrorMessage = signal('');

  pageNumber = signal(1);
  pageSize = signal(10);
  totalRecords = signal(0);
  totalPages = signal(0);

  filters: EnrollmentFilter = {
    search: '',
    courseId: null,
    status: null,
    fromDate: '',
    toDate: '',
  };

  ngOnInit(): void {
    this.loadCourses();
    this.loadEnrollments();
  }

  // Load courses
  loadCourses(): void {
    this.courseService.getCourses(1, 100).subscribe({
      next: (response) => {
        this.courses.set(response.items);
      },
      error: (error) => {
        console.error('Error loading courses:', error);
      },
    });
  }

  // Load only approved students
  loadApprovedStudents(): void {
    this.studentService.getStudents(1, 100, {
      status: 1,
    }).subscribe({
      next: (response) => {
        this.approvedStudents.set(response.items);
      },
      error: (error) => {
        console.error('Error loading approved students:', error);
        this.formErrorMessage.set('Unable to load approved students.');
      },
    });
  }

  // Open enrollment modal
  openEnrollModal(): void {
    this.selectedStudentId.set(null);
    this.selectedCourseId.set(null);
    this.formErrorMessage.set('');
    this.successMessage.set('');

    this.loadApprovedStudents();
    this.isEnrollModalOpen.set(true);
  }

  // Close enrollment modal
  closeEnrollModal(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.isEnrollModalOpen.set(false);
    this.formErrorMessage.set('');
  }

  // Create enrollment as Admin
  submitAdminEnrollment(): void {
    const studentId = this.selectedStudentId();
    const courseId = this.selectedCourseId();

    if (studentId === null || courseId === null) {
      this.formErrorMessage.set(
        'Please select both a student and a course.',
      );
      return;
    }

    this.isSubmitting.set(true);
    this.formErrorMessage.set('');
    this.successMessage.set('');

    this.enrollmentService.createAdminEnrollment({
      studentId,
      courseId,
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isEnrollModalOpen.set(false);

        this.selectedStudentId.set(null);
        this.selectedCourseId.set(null);

        this.successMessage.set('Student enrolled successfully.');

        this.pageNumber.set(1);
        this.loadEnrollments();
      },
      error: (error) => {
        console.error('Error creating enrollment:', error);

        this.formErrorMessage.set(
          error.error?.detail ||
          error.error?.message ||
          'Unable to create enrollment.',
        );

        this.isSubmitting.set(false);
      },
    });
  }

  // Load enrollments with filters and pagination
  loadEnrollments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.enrollmentService
      .getEnrollments(
        this.pageNumber(),
        this.pageSize(),
        this.filters,
      )
      .subscribe({
        next: (response) => {
          this.enrollments.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading enrollments:', error);

          this.errorMessage.set(
            error.error?.detail ||
            error.error?.message ||
            'Unable to load enrollments.',
          );

          this.isLoading.set(false);
        },
      });
  }

  // Apply filters
  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadEnrollments();
  }

  // Reset filters
  clearFilters(): void {
    this.filters = {
      search: '',
      courseId: null,
      status: null,
      fromDate: '',
      toDate: '',
    };

    this.pageNumber.set(1);
    this.loadEnrollments();
  }

  // Change page size
  changePageSize(size: string): void {
    this.pageSize.set(Number(size));
    this.pageNumber.set(1);
    this.loadEnrollments();
  }

  // Pagination
  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadEnrollments();
    }
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadEnrollments();
    }
  }

  // Enrollment status
  statusLabel(status: number): string {
    return status === 0 ? 'Active' : 'Cancelled';
  }
}

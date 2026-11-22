
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { CourseService } from '../course.service';
import { CourseResponse, SaveCourseRequest } from '../course.models';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-list.html',
  styleUrl: './course-list.css',
})
export class CourseListComponent implements OnInit {
  private courseService = inject(CourseService);

  // Course list
  courses = signal<CourseResponse[]>([]);

  // Loading and error states
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Add course form
  showAddForm = signal(false);

  newCourse: SaveCourseRequest = this.getEmptyCourse();

  // Pagination
  pageNumber = signal(1);
  pageSize = signal(10);

  totalRecords = signal(0);
  totalPages = signal(0);

  ngOnInit(): void {
    this.loadCourses();
  }

  // Empty course form
  private getEmptyCourse(): SaveCourseRequest {
    return {
      courseName: '',
      duration: '',
      fees: 0,
      capacity: 1,
      isActive: true,
    };
  }

  // Load courses from backend
  loadCourses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.courseService
      .getCourses(this.pageNumber(), this.pageSize())
      .subscribe({
        next: (response) => {
          this.courses.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);

          this.isLoading.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error('Error loading courses:', error);

          this.errorMessage.set(
            this.getErrorMessage(error, 'Unable to load courses.'),
          );

          this.isLoading.set(false);
        },
      });
  }

  // Open Add Course form
  openAddCourseForm(): void {
    this.newCourse = this.getEmptyCourse();
    this.errorMessage.set('');
    this.successMessage.set('');
    this.showAddForm.set(true);
  }

  // Close Add Course form
  closeAddCourseForm(): void {
    if (this.isSaving()) {
      return;
    }

    this.showAddForm.set(false);
    this.newCourse = this.getEmptyCourse();
  }

  // Create a new course
  addCourse(): void {
    if (this.isSaving()) {
      return;
    }

    const request: SaveCourseRequest = {
      courseName: this.newCourse.courseName.trim(),
      duration: this.newCourse.duration.trim(),
      fees: Number(this.newCourse.fees),
      capacity: Number(this.newCourse.capacity),
      isActive: this.newCourse.isActive,
    };

    if (!request.courseName || !request.duration) {
      this.errorMessage.set('Course name and duration are required.');
      return;
    }

    if (
      !Number.isFinite(request.fees) ||
      request.fees < 0 ||
      !Number.isInteger(request.capacity) ||
      request.capacity < 1
    ) {
      this.errorMessage.set(
        'Enter valid fees and a capacity of at least 1.',
      );
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    this.courseService.createCourse(request).subscribe({
      next: (response) => {
        console.log('Course created successfully:', response);

        this.isSaving.set(false);
        this.showAddForm.set(false);

        this.newCourse = this.getEmptyCourse();

        this.successMessage.set(
          `${response.courseName} was created successfully.`,
        );

        this.pageNumber.set(1);
        this.loadCourses();
      },

      error: (error: HttpErrorResponse) => {
        console.error('Error creating course:', error);

        this.errorMessage.set(
          this.getErrorMessage(error, 'Unable to create course.'),
        );

        this.isSaving.set(false);
      },
    });
  }

  // Navigate to next page
  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadCourses();
    }
  }

  // Navigate to previous page
  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadCourses();
    }
  }

  // Handle API errors
  private getErrorMessage(
    error: HttpErrorResponse,
    fallback: string,
  ): string {
    const body = error.error;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body?.detail) {
      return body.detail;
    }

    if (body?.message) {
      return body.message;
    }

    if (body?.title) {
      return body.title;
    }

    if (body?.errors) {
      return Object.values(body.errors).flat().join(' ');
    }

    return fallback;
  }
}

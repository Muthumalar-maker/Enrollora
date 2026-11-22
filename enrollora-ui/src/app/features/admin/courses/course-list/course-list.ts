
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

  courses = signal<CourseResponse[]>([]);

  isLoading = signal(false);
  isSaving = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  showAddForm = signal(false);
  editingCourseId = signal<number | null>(null);

  newCourse: SaveCourseRequest = this.getEmptyCourse();

  pageNumber = signal(1);
  pageSize = signal(10);

  totalRecords = signal(0);
  totalPages = signal(0);

  ngOnInit(): void {
    this.loadCourses();
  }

  private getEmptyCourse(): SaveCourseRequest {
    return {
      courseName: '',
      duration: '',
      fees: 0,
      capacity: 1,
      isActive: true,
    };
  }

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
            this.getErrorMessage(error, 'Unable to load courses.')
          );
          this.isLoading.set(false);
        },
      });
  }

  openAddCourseForm(): void {
    this.newCourse = this.getEmptyCourse();
    this.editingCourseId.set(null);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.showAddForm.set(true);
  }

  openEditCourseForm(course: CourseResponse): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    this.isSaving.set(true);

    this.courseService.getCourseById(course.courseId).subscribe({
      next: (response) => {
        this.newCourse = {
          courseName: response.courseName,
          duration: response.duration,
          fees: response.fees,
          capacity: response.capacity,
          isActive: response.isActive,
        };

        this.editingCourseId.set(response.courseId);
        this.showAddForm.set(true);
        this.isSaving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          this.getErrorMessage(error, 'Unable to load course details.')
        );
        this.isSaving.set(false);
      },
    });
  }

  closeAddCourseForm(): void {
    if (this.isSaving()) {
      return;
    }

    this.showAddForm.set(false);
    this.editingCourseId.set(null);
    this.newCourse = this.getEmptyCourse();
    this.errorMessage.set('');
  }

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
        'Enter valid fees and a capacity of at least 1.'
      );
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const courseId = this.editingCourseId();

    if (courseId !== null) {
      this.courseService.updateCourse(courseId, request).subscribe({
        next: (response) => {
          this.finishSave(
            `${response.courseName} was updated successfully.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.handleSaveError(error, 'Unable to update course.');
        },
      });
    } else {
      this.courseService.createCourse(request).subscribe({
        next: (response) => {
          this.pageNumber.set(1);
          this.finishSave(
            `${response.courseName} was created successfully.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.handleSaveError(error, 'Unable to create course.');
        },
      });
    }
  }

  private finishSave(message: string): void {
    this.isSaving.set(false);
    this.showAddForm.set(false);
    this.editingCourseId.set(null);
    this.newCourse = this.getEmptyCourse();
    this.successMessage.set(message);
    this.loadCourses();
  }

  private handleSaveError(
    error: HttpErrorResponse,
    fallback: string
  ): void {
    console.error('Course save error:', error);

    this.errorMessage.set(this.getErrorMessage(error, fallback));
    this.isSaving.set(false);
  }

  deactivateCourse(course: CourseResponse): void {
    if (this.isSaving()) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${course.courseName}"?`
    );

    if (!confirmed) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.courseService.deactivateCourse(course.courseId).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.successMessage.set(
          `${course.courseName} was deactivated successfully.`
        );
        this.loadCourses();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Course deactivation error:', error);
        this.errorMessage.set(
          this.getErrorMessage(error, 'Unable to deactivate course.')
        );
        this.isSaving.set(false);
      },
    });
  }

  activateCourse(course: CourseResponse): void {
    if (this.isSaving()) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to activate "${course.courseName}"?`
    );

    if (!confirmed) {
      return;
    }

    const request: SaveCourseRequest = {
      courseName: course.courseName,
      duration: course.duration,
      fees: course.fees,
      capacity: course.capacity,
      isActive: true,
    };

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.courseService.updateCourse(course.courseId, request).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.successMessage.set(
          `${course.courseName} was activated successfully.`
        );
        this.loadCourses();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Course activation error:', error);
        this.errorMessage.set(
          this.getErrorMessage(error, 'Unable to activate course.')
        );
        this.isSaving.set(false);
      },
    });
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadCourses();
    }
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadCourses();
    }
  }

  private getErrorMessage(
    error: HttpErrorResponse,
    fallback: string
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

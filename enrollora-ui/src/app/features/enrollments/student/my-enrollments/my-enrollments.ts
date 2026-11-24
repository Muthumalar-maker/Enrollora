
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  EnrollmentResponse,
  CancellationResponse,
} from '../../enrollment.models';
import { EnrollmentService } from '../../enrollment.service';

@Component({
  selector: 'app-my-enrollments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './my-enrollments.css',
  templateUrl: './my-enrollments.html',
})
export class MyEnrollments implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);

  enrollments = signal<EnrollmentResponse[]>([]);
  pendingCancellationIds = signal<Set<number>>(new Set());

  isLoading = signal(false);
  isSubmitting = signal(false);

  errorMessage = signal('');
  successMessage = signal('');
  cancellationError = signal('');

  selectedEnrollmentId = signal<number | null>(null);
  cancellationReason = signal('');

  pageNumber = signal(1);
  pageSize = signal(10);
  totalRecords = signal(0);
  totalPages = signal(0);

  ngOnInit(): void {
    this.loadEnrollments();
    this.loadCancellationRequests();
  }

  loadEnrollments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.enrollmentService
      .getMyEnrollments(this.pageNumber(), this.pageSize())
      .subscribe({
        next: (response) => {
          this.enrollments.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const body = error.error;
          this.errorMessage.set(
            body?.detail ||
            body?.message ||
            body?.title ||
            'Unable to load your enrollments.',
          );
          this.isLoading.set(false);
        },
      });
  }

  loadCancellationRequests(): void {
    this.enrollmentService.getMyCancellationRequests().subscribe({
      next: (response) => {
        const pendingIds = new Set(
          response.items
            .filter((request: CancellationResponse) => request.status === 0)
            .map((request: CancellationResponse) => request.enrollmentId),
        );

        this.pendingCancellationIds.set(pendingIds);
      },
      error: () => {
        this.cancellationError.set(
          'Unable to load cancellation request information.',
        );
      },
    });
  }

  statusLabel(status: number): string {
    return status === 0 ? 'Active' : 'Cancelled';
  }

  openCancellationForm(enrollmentId: number): void {
    this.selectedEnrollmentId.set(enrollmentId);
    this.cancellationReason.set('');
    this.cancellationError.set('');
    this.successMessage.set('');
  }

  closeCancellationForm(): void {
    this.selectedEnrollmentId.set(null);
    this.cancellationReason.set('');
    this.cancellationError.set('');
  }

  submitCancellationRequest(): void {
    const enrollmentId = this.selectedEnrollmentId();
    const reason = this.cancellationReason().trim();

    if (!enrollmentId) {
      return;
    }

    if (!reason) {
      this.cancellationError.set(
        'Please enter a reason for cancellation.',
      );
      return;
    }

    if (reason.length > 1000) {
      this.cancellationError.set(
        'Reason cannot exceed 1000 characters.',
      );
      return;
    }

    this.isSubmitting.set(true);
    this.cancellationError.set('');
    this.successMessage.set('');

    this.enrollmentService
      .createCancellationRequest(enrollmentId, { reason })
      .subscribe({
        next: () => {
          this.pendingCancellationIds.update((ids) => {
            const updated = new Set(ids);
            updated.add(enrollmentId);
            return updated;
          });

          this.successMessage.set(
            'Cancellation request submitted successfully. Waiting for admin approval.',
          );

          this.closeCancellationForm();
          this.isSubmitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const body = error.error;

          this.cancellationError.set(
            body?.detail ||
            body?.message ||
            body?.title ||
            'Unable to submit cancellation request.',
          );

          this.isSubmitting.set(false);
        },
      });
  }

  previousPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      this.loadEnrollments();
    }
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update((page) => page + 1);
      this.loadEnrollments();
    }
  }
}

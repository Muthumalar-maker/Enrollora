
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CancellationResponse,
  CancellationFilter,
} from '../../enrollments/enrollment.models';

import { EnrollmentService } from '../../enrollments/enrollment.service';

@Component({
  selector: 'app-cancellation-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancellation-requests.html',
  styleUrl: './cancellation-requests.css',
})
export class CancellationRequests implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);

  requests = signal<CancellationResponse[]>([]);

  isLoading = signal(false);
  isSubmitting = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  pageNumber = signal(1);
  pageSize = signal(10);
  totalRecords = signal(0);
  totalPages = signal(0);

  searchTerm = signal('');
  selectedStatus = signal<number | null>(null);

  selectedRequest = signal<CancellationResponse | null>(null);
  reviewAction = signal<'approve' | 'reject' | null>(null);
  adminRemarks = signal('');

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const filters: CancellationFilter = {
      search: this.searchTerm(),
      status: this.selectedStatus(),
    };

    this.enrollmentService
      .getCancellationRequests(
        this.pageNumber(),
        this.pageSize(),
        filters,
      )
      .subscribe({
        next: (response) => {
          this.requests.set(response.items);
          this.totalRecords.set(response.totalRecords);
          this.totalPages.set(response.totalPages);
          this.pageNumber.set(response.pageNumber);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.detail ||
            error.error?.message ||
            error.error?.title ||
            'Unable to load cancellation requests.',
          );
          this.isLoading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.pageNumber.set(1);
    this.loadRequests();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set(null);
    this.pageNumber.set(1);
    this.loadRequests();
  }

  statusLabel(status: number): string {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Approved';
      case 2: return 'Rejected';
      default: return 'Unknown';
    }
  }

  openReviewModal(
    request: CancellationResponse,
    action: 'approve' | 'reject',
  ): void {
    this.selectedRequest.set(request);
    this.reviewAction.set(action);
    this.adminRemarks.set('');
    this.errorMessage.set('');
  }

  closeReviewModal(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.selectedRequest.set(null);
    this.reviewAction.set(null);
    this.adminRemarks.set('');
  }

  submitReview(): void {
    const request = this.selectedRequest();
    const action = this.reviewAction();

    if (!request || !action || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.enrollmentService
      .reviewCancellationRequest(
        request.cancellationRequestId,
        action,
        { adminRemarks: this.adminRemarks().trim() || null },
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeReviewModal();

          this.successMessage.set(
            action === 'approve'
              ? 'Cancellation request approved successfully.'
              : 'Cancellation request rejected successfully.',
          );

          this.loadRequests();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.detail ||
            error.error?.message ||
            error.error?.title ||
            'Unable to review cancellation request.',
          );

          this.isSubmitting.set(false);
        },
      });
  }

  previousPage(): void {
    if (this.pageNumber() > 1 && !this.isLoading()) {
      this.pageNumber.update(page => page - 1);
      this.loadRequests();
    }
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages() && !this.isLoading()) {
      this.pageNumber.update(page => page + 1);
      this.loadRequests();
    }
  }

  changePageSize(size: string): void {
    this.pageSize.set(Number(size));
    this.pageNumber.set(1);
    this.loadRequests();
  }
}

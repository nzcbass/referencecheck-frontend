/**
 * RequestList Component
 * Display all reference requests with referee details and authorization workflow
 */

import React, { useState, useEffect } from 'react';
import { ReferenceReport } from './ReferenceReport';
import { ConversationalReferenceCheck } from './ConversationalReferenceCheck';

interface Referee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  relationship: string;
  company?: string | null;
  status: string;
  has_completed: boolean;
  submitted_at: string | null;
  last_contacted_at: string | null;
  initial_sent_at: string | null;
  consent_signature?: string | null;
  consent_signed_at?: string | null;
  consent_agreed?: boolean;
}

interface RequestWithReferees {
  id: string;
  candidate_first_name: string;
  candidate_last_name: string;
  position_applied_for: string;
  candidate_email: string;
  candidate_phone_number: string | null;
  status: string;
  created_at: string;
  authorization_status?: string;
  authorization_method?: string;
  authorization_completed_at?: string;
  authorization_sent_at?: string;
  referees: Referee[];
  summary: {
    total_referees: number;
    completed: number;
    pending: number;
  };
}

interface CandidateEditData {
  id: string;
  candidate_first_name: string;
  candidate_last_name: string;
  candidate_email: string;
  candidate_phone_number: string | null;
  position_applied_for: string;
  authorization_status?: string;
  authorization_method?: string;
  authorization_completed_at?: string;
  authorization_signature?: string;
}

interface RequestListProps {
  userId: string;
  apiUrl?: string;
  onSelectRequest?: (requestId: string) => void;
}

export const RequestList: React.FC<RequestListProps> = ({
  userId,
  apiUrl = 'http://localhost:5001/api',
  onSelectRequest,
}) => {
  const [requestsWithReferees, setRequestsWithReferees] = useState<RequestWithReferees[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openRefereeMenuId, setOpenRefereeMenuId] = useState<string | null>(null);
  const [menuPositions, setMenuPositions] = useState<Record<string, 'up' | 'down'>>({});
  const [showingReport, setShowingReport] = useState<{ requestId: string; refereeId: string } | null>(null);
  const [showingConversation, setShowingConversation] = useState<{ token: string } | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // newest first
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingReferee, setEditingReferee] = useState<Referee | null>(null);
  const [savingReferee, setSavingReferee] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<CandidateEditData | null>(null);
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [sendingAuthForRequest, setSendingAuthForRequest] = useState<string | null>(null);

  const fetchWithRetry = async (url: string, retries = 3, delay = 500): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        // Add cache busting to ensure fresh data
        const cacheBuster = `_t=${Date.now()}`;
        const separator = url.includes('?') ? '&' : '?';
        const finalUrl = `${url}${separator}${cacheBuster}`;
        
        const response = await fetch(finalUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        const data = await response.json();
        if (response.ok) {
          return data;
        }
        // If it's a server error and we have retries left, try again
        if (response.status >= 500 && i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          continue;
        }
        throw new Error(data.error || 'Request failed');
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
    throw new Error('Max retries reached');
  };

  const fetchRequestsWithDetails = async (showLoader: boolean = true) => {
    if (showLoader) {
      setLoading(true);
    }
    setError('');

    try {
      // First, get all requests
      const params = new URLSearchParams({ user_id: userId });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const data = await fetchWithRetry(`${apiUrl}/requests?${params}`);
      let requests = data.requests || [];

      // Filter out draft_candidate requests (where Begin Reference Checking wasn't clicked)
      // Keep requests that are NOT draft_candidate, OR that have been sent (status='sent')
      requests = requests.filter((req: any) => {
        // Keep all non-draft_candidate requests
        if (req.status !== 'draft_candidate') return true;
        // Also keep draft_candidate if it has authorization_sent_at (shouldn't happen, but safety check)
        if (req.authorization_sent_at) return true;
        // Filter out draft_candidate without authorization_sent_at
        return false;
      });

      // Fetch details in batches of 2 to avoid overwhelming the connection pool
      const batchSize = 2;
      const allDetails = [];
      
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const batchPromises = batch.map(async (req: any) => {
          try {
            return await fetchWithRetry(`${apiUrl}/requests/${req.id}`);
          } catch (err) {
            console.error(`Failed to fetch details for request ${req.id}:`, err);
            // Return a minimal object so we don't lose the request entirely
            return {
              request: req,
              referees: [],
              summary: { total_referees: 0, completed: 0, pending: 0 }
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        allDetails.push(...batchResults);
        
        // Small delay between batches to avoid overwhelming the connection pool
        if (i + batchSize < requests.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Combine request data with referee details
      const combined = allDetails
        .filter(detail => detail && detail.request)
        .map((detail) => ({
          ...detail.request,
          referees: detail.referees || [],
          summary: detail.summary || { total_referees: 0, completed: 0, pending: 0 }
        }));

      setRequestsWithReferees(combined);
      setLastRefreshed(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId: string, candidateName: string) => {
    if (!confirm(`⚠️ DELETE CANDIDATE?\n\nAre you sure you want to delete ${candidateName} and all their referees?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/requests/${requestId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete request');
      }

      // Refresh the list
      await fetchRequestsWithDetails();
      
      alert(`✅ Deleted ${candidateName} and all associated referees`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const handleSendReminder = async (requestId: string, refereeId: string, refereeName: string) => {
    if (!confirm(`📧 SEND REMINDER?\n\nSend a reminder email to ${refereeName}?`)) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/requests/${requestId}/referees/${refereeId}/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: 'email'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminder');
      }

      // Refresh the list to show updated last_contacted_at
      await fetchRequestsWithDetails();
      
      alert(`✅ Reminder sent to ${refereeName}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const handleCompletePhoneReference = async (requestId: string, refereeId: string, refereeName: string) => {
    if (!confirm(`📞 COMPLETE PHONE REFERENCE\n\nComplete reference for ${refereeName} via phone?\n\nThis will open the conversational form where you can enter their responses as you speak with them.`)) {
      return;
    }

    try {
      // Get token for this specific referee
      const response = await fetch(`${apiUrl}/requests/${requestId}/referees/${refereeId}/phone-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get reference token');
      }

      setShowingConversation({ token: data.token });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const handleSendAuthorization = async (requestId: string, candidateName: string) => {
    // Prevent duplicate sends
    if (sendingAuthForRequest === requestId) {
      alert('⏳ Already sending authorization email to this candidate. Please wait...');
      return;
    }

    if (!confirm(`📧 SEND AUTHORIZATION REQUEST\n\nSend authorization email to ${candidateName}?\n\nThey will receive an email with a link to sign the authorization form online.\n\n⚠️ Note: Only the most recent email link will work. Previous links will be invalidated.`)) {
      return;
    }

    setSendingAuthForRequest(requestId);
    try {
      const response = await fetch(`${apiUrl}/requests/${requestId}/send-authorization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send authorization');
      }

      // Optimistic UI update - immediately update local state
      setRequestsWithReferees(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, authorization_status: 'pending' }
          : req
      ));

      // Close menu and show success immediately
      setOpenRefereeMenuId(null);
      alert(`✅ Authorization request sent to ${candidateName}!\n\nThey will receive an email shortly. Only this latest link will work - any previous authorization links are now invalid.`);
      
      // Refresh data in background (no await)
      fetchRequestsWithDetails(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setSendingAuthForRequest(null);
    }
  };

  const handleMarkVerbalAuthorization = async (requestId: string, candidateName: string) => {
    if (!confirm(`✅ VERBAL AUTHORIZATION\n\nMark ${candidateName} as VERBALLY authorized?\n\n⚠️ ONLY click YES if you have spoken to the candidate and they have given permission to contact their referees.\n\nThis will allow you to immediately proceed with sending reference requests.`)) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/requests/${requestId}/verbal-authorization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      console.log('Verbal authorization response:', response.status, data);

      if (!response.ok) {
        console.error('Verbal authorization failed:', data);
        const errorMsg = data.message || data.error || 'Failed to mark as verbally authorized';
        const details = data.traceback ? `\n\nDetails: ${data.type || 'Unknown error'}` : '';
        throw new Error(errorMsg + details);
      }

      // Optimistic UI update - immediately update local state
      setRequestsWithReferees(prev => prev.map(req => 
        req.id === requestId 
          ? { 
              ...req, 
              authorization_status: 'verbal',
              authorization_method: 'verbal',
              authorization_completed_at: new Date().toISOString()
            }
          : req
      ));

      // Close menu and show success immediately
      setOpenRefereeMenuId(null);
      alert(`✅ ${candidateName} marked as verbally authorized!\n\nYou can now add referees and send invitations.`);
      
      // Refresh data in background (no await)
      fetchRequestsWithDetails(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error marking verbal authorization:', err);
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column - dates default to desc (newest first), text to asc (A-Z)
      setSortColumn(column);
      setSortDirection((column === 'created' || column === 'last_contact' || column === 'start_date') ? 'desc' : 'asc');
    }
  };

  const formatStartDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    let timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    // Remove leading zero from hour
    timeStr = timeStr.replace(/^0/, '');
    return (
      <div style={{ textAlign: 'center', fontSize: '12px' }}>
        <div>{dateStr}</div>
        <div style={{ color: '#666' }}>{timeStr}</div>
      </div>
    );
  };

  const formatTimeNoLeadingZero = (dateString: string) => {
    const date = new Date(dateString);
    let timeStr = date.toLocaleTimeString('en-NZ', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Pacific/Auckland'
    });
    // Remove leading zero from hour (e.g., "08:22" -> "8:22")
    timeStr = timeStr.replace(/^0/, '');
    return timeStr;
  };

  const getFilteredAndSortedData = () => {
    // First filter by search term
    let filtered = requestsWithReferees;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = requestsWithReferees.filter(req => {
        // Check candidate name
        const candidateName = `${req.candidate_first_name} ${req.candidate_last_name}`.toLowerCase();
        if (candidateName.includes(term)) return true;
        
        // Check referee names
        return req.referees.some(referee => {
          const refereeName = `${referee.first_name} ${referee.last_name}`.toLowerCase();
          return refereeName.includes(term);
        });
      });
    }
    
    // Then sort
    const sorted = [...filtered];
    
    sorted.sort((a, b) => {
      let compareA: any;
      let compareB: any;
      
      switch (sortColumn) {
        case 'start_date':
          compareA = a.authorization_sent_at ? new Date(a.authorization_sent_at).getTime() : 0;
          compareB = b.authorization_sent_at ? new Date(b.authorization_sent_at).getTime() : 0;
          break;
        case 'candidate':
          compareA = `${a.candidate_first_name || ''} ${a.candidate_last_name || ''}`.trim().toLowerCase();
          compareB = `${b.candidate_first_name || ''} ${b.candidate_last_name || ''}`.trim().toLowerCase();
          break;
        case 'position':
          compareA = (a.position_applied_for || '').toLowerCase();
          compareB = (b.position_applied_for || '').toLowerCase();
          break;
        case 'created':
          compareA = new Date(a.created_at).getTime();
          compareB = new Date(b.created_at).getTime();
          break;
        case 'last_contact':
          // Find the most recent contact time across all referees
          const getLatestContact = (req: RequestWithReferees) => {
            if (!req.referees || req.referees.length === 0) return 0;
            const times = req.referees
              .map(r => r.last_contacted_at ? new Date(r.last_contacted_at).getTime() : 0)
              .filter(t => t > 0);
            return times.length > 0 ? Math.max(...times) : 0;
          };
          compareA = getLatestContact(a);
          compareB = getLatestContact(b);
          break;
        default:
          return 0;
      }
      
      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  const renderSortIndicator = (column: string) => {
    if (sortColumn !== column) return ' ⇅';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const handleRefereeClick = async (referee: Referee) => {
    try {
      // Fetch full referee details including consent data
      const response = await fetch(`${apiUrl}/referees/${referee.id}`);
      const data = await response.json();

      if (response.ok && data.referee) {
        // Use the detailed referee data which includes consent fields
        setEditingReferee(data.referee);
      } else {
        // Fallback to local data if fetch fails
        setEditingReferee({ ...referee });
      }
    } catch (error) {
      console.error('Failed to fetch referee details:', error);
      // Fallback to local data if fetch fails
      setEditingReferee({ ...referee });
    }
  };

  const handleRefereeMenuClick = (refereeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (openRefereeMenuId === refereeId) {
      setOpenRefereeMenuId(null);
      return;
    }

    // Calculate if menu should appear above or below for THIS specific button
    const button = event.currentTarget as HTMLElement;
    const buttonRect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const menuHeight = 400; // Approximate menu height (increased for safety)

    // Store position for this specific menu
    // Open upward if less than menuHeight space below OR in bottom 40% of viewport
    const isNearBottom = buttonRect.bottom > viewportHeight * 0.6;
    setMenuPositions(prev => ({
      ...prev,
      [refereeId]: (spaceBelow < menuHeight || isNearBottom) ? 'up' : 'down'
    }));
    
    setOpenRefereeMenuId(refereeId);
  };

  const handleSaveReferee = async () => {
    if (!editingReferee) return;

    setSavingReferee(true);
    try {
      const response = await fetch(`${apiUrl}/referees/${editingReferee.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: editingReferee.first_name,
          last_name: editingReferee.last_name,
          email: editingReferee.email,
          phone: editingReferee.phone || null,
          relationship: editingReferee.relationship,
          company: editingReferee.company || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update referee');
      }

      // Optimistic UI update - immediately update local state
      setRequestsWithReferees(prev => prev.map(req => ({
        ...req,
        referees: req.referees.map(ref =>
          ref.id === editingReferee.id
            ? {
                ...ref,
                first_name: editingReferee.first_name,
                last_name: editingReferee.last_name,
                email: editingReferee.email,
                phone: editingReferee.phone || null,
                relationship: editingReferee.relationship,
                company: editingReferee.company || null,
              }
            : ref
        )
      })));

      // Close modal and show success immediately
      setEditingReferee(null);
      setSavingReferee(false);
      alert('✅ Referee details updated successfully!');
      
      // Refresh data in background (no await)
      fetchRequestsWithDetails(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      alert(`❌ Error: ${errorMessage}`);
      setSavingReferee(false);
    }
  };

  const handleCandidateClick = (request: RequestWithReferees) => {
    setEditingCandidate({
      id: request.id,
      candidate_first_name: request.candidate_first_name,
      candidate_last_name: request.candidate_last_name,
      candidate_email: request.candidate_email,
      candidate_phone_number: request.candidate_phone_number,
      position_applied_for: request.position_applied_for,
      authorization_status: request.authorization_status,
      authorization_method: request.authorization_method,
      authorization_completed_at: request.authorization_completed_at,
      authorization_signature: request.authorization_signature,
    });
  };

  const handleDownloadAuthorization = async () => {
    if (!editingCandidate) return;

    const isAuthorized = editingCandidate.authorization_status === 'authorized' ||
                        editingCandidate.authorization_status === 'verbal';

    if (!isAuthorized) {
      alert('⚠️ This candidate has not completed authorization yet.');
      return;
    }

    try {
      // Dynamically import jsPDF
      const { jsPDF } = await import('jspdf');

      const authMethod = editingCandidate.authorization_method === 'online' ? 'Online Form' : 'Verbal';
      const completedDate = editingCandidate.authorization_completed_at
        ? new Date(editingCandidate.authorization_completed_at).toLocaleString('en-NZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Pacific/Auckland'
          })
        : 'N/A';

      const generatedDate = new Date().toLocaleString('en-NZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Pacific/Auckland'
      });

      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = 20;

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Reference Check Authorization Form', pageWidth / 2, 18, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Record of Candidate Authorization', pageWidth / 2, 28, { align: 'center' });

      yPos = 55;
      doc.setTextColor(0, 0, 0);

      // Candidate Information Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Candidate Information', margin, yPos);
      yPos += 10;

      // Draw light blue box for candidate info
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, yPos - 5, contentWidth, 50 + (editingCandidate.candidate_phone_number ? 10 : 0), 'F');
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(2);
      doc.line(margin, yPos - 5, margin, yPos + 45 + (editingCandidate.candidate_phone_number ? 10 : 0));

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);

      doc.text('Full Name:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`${editingCandidate.candidate_first_name} ${editingCandidate.candidate_last_name}`, margin + 5, yPos + 5);
      yPos += 15;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Email:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(editingCandidate.candidate_email, margin + 5, yPos + 5);
      yPos += 15;

      if (editingCandidate.candidate_phone_number) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text('Phone:', margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(editingCandidate.candidate_phone_number, margin + 5, yPos + 5);
        yPos += 15;
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Position Applied For:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(editingCandidate.position_applied_for, margin + 5, yPos + 5);
      yPos += 20;

      // Authorization Details Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Authorization Details', margin, yPos);
      yPos += 10;

      // Draw light blue box for auth details
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, yPos - 5, contentWidth, 40, 'F');
      doc.setDrawColor(37, 99, 235);
      doc.line(margin, yPos - 5, margin, yPos + 35);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);

      doc.text('Authorization Method:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(authMethod, margin + 5, yPos + 5);
      yPos += 15;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Date Completed:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(completedDate, margin + 5, yPos + 5);
      yPos += 15;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Status:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(21, 128, 61);
      doc.text('✓ Authorized', margin + 5, yPos + 5);
      yPos += 20;

      // Authorization Statement Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Authorization Statement', margin, yPos);
      yPos += 10;

      // Draw yellow box for authorization statement
      doc.setFillColor(254, 243, 199);
      doc.rect(margin, yPos - 5, contentWidth, 40, 'F');
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(2);
      doc.line(margin, yPos - 5, margin, yPos + 35);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('The candidate has authorized the following:', margin + 5, yPos);
      yPos += 7;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const authItems = [
        '• Permission to contact their professional referees',
        '• Collection of feedback about their work history and performance',
        '• Use of this information in the hiring decision process'
      ];

      authItems.forEach(item => {
        doc.text(item, margin + 5, yPos);
        yPos += 7;
      });
      yPos += 8;

      // Signature Section (if available)
      if (editingCandidate.authorization_signature) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text('Electronic Signature', margin, yPos);
        yPos += 10;

        // Draw light blue box for signature
        doc.setFillColor(240, 249, 255);
        doc.rect(margin, yPos - 5, contentWidth, 25, 'F');
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(1);
        doc.rect(margin, yPos - 5, contentWidth, 25);

        doc.setFontSize(18);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(37, 99, 235);
        doc.text(editingCandidate.authorization_signature, margin + 5, yPos + 5);
        yPos += 12;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(`Signed electronically on ${completedDate}`, margin + 5, yPos + 5);
        yPos += 15;
      }

      // Footer
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, 270, pageWidth - margin, 270);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(`This document was generated on ${generatedDate}`, pageWidth / 2, 277, { align: 'center' });
      doc.text('Reference Check System - Official Authorization Record', pageWidth / 2, 282, { align: 'center' });

      // Save PDF
      const fileName = `Authorization_${editingCandidate.candidate_first_name}_${editingCandidate.candidate_last_name}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('❌ Failed to generate PDF. Please try again or contact support.');
    }
  };

  const handleDownloadRefereeAuthorization = async () => {
    if (!editingReferee) return;

    const hasConsent = editingReferee.consent_agreed && editingReferee.consent_signature;

    if (!hasConsent) {
      alert('⚠️ This referee has not completed the consent form yet.');
      return;
    }

    try {
      // Dynamically import jsPDF
      const { jsPDF } = await import('jspdf');

      const signedDate = editingReferee.consent_signed_at
        ? new Date(editingReferee.consent_signed_at).toLocaleString('en-NZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Pacific/Auckland'
          })
        : 'N/A';

      const generatedDate = new Date().toLocaleString('en-NZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Pacific/Auckland'
      });

      // Find the request this referee belongs to
      const request = requestsWithReferees.find(req =>
        req.referees.some(ref => ref.id === editingReferee.id)
      );

      const candidateName = request
        ? `${request.candidate_first_name} ${request.candidate_last_name}`
        : 'the candidate';
      const position = request?.position_applied_for || 'the position';

      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = 20;

      // Header
      doc.setFillColor(139, 92, 246); // Purple color for referee docs
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Referee Consent Form', pageWidth / 2, 18, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Record of Referee Authorization', pageWidth / 2, 28, { align: 'center' });

      yPos = 55;
      doc.setTextColor(0, 0, 0);

      // Referee Information Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Referee Information', margin, yPos);
      yPos += 10;

      // Draw light purple box for referee info
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, yPos - 5, contentWidth, 50 + (editingReferee.phone ? 10 : 0) + (editingReferee.company ? 10 : 0), 'F');
      doc.setDrawColor(139, 92, 246);
      doc.setLineWidth(2);
      doc.line(margin, yPos - 5, margin, yPos + 45 + (editingReferee.phone ? 10 : 0) + (editingReferee.company ? 10 : 0));

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);

      doc.text('Full Name:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`${editingReferee.first_name} ${editingReferee.last_name}`, margin + 5, yPos + 5);
      yPos += 15;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Email:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(editingReferee.email, margin + 5, yPos + 5);
      yPos += 15;

      if (editingReferee.phone) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text('Phone:', margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(editingReferee.phone, margin + 5, yPos + 5);
        yPos += 15;
      }

      if (editingReferee.company) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text('Company:', margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(editingReferee.company, margin + 5, yPos + 5);
        yPos += 15;
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Relationship:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(editingReferee.relationship, margin + 5, yPos + 5);
      yPos += 20;

      // Reference Details Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Reference Details', margin, yPos);
      yPos += 10;

      // Draw light purple box
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, yPos - 5, contentWidth, 30, 'F');
      doc.setDrawColor(139, 92, 246);
      doc.line(margin, yPos - 5, margin, yPos + 25);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);

      doc.text('Candidate:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(candidateName, margin + 5, yPos + 5);
      yPos += 15;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Position:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(position, margin + 5, yPos + 5);
      yPos += 20;

      // Consent Details Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Consent Details', margin, yPos);
      yPos += 10;

      // Draw light purple box
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, yPos - 5, contentWidth, 30, 'F');
      doc.setDrawColor(139, 92, 246);
      doc.line(margin, yPos - 5, margin, yPos + 25);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);

      doc.text('Date Signed:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(signedDate, margin + 5, yPos + 5);
      yPos += 15;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text('Status:', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(21, 128, 61);
      doc.text('✓ Consent Given', margin + 5, yPos + 5);
      yPos += 20;

      // Consent Statement Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Consent Statement', margin, yPos);
      yPos += 10;

      // Draw purple box for consent statement
      doc.setFillColor(243, 232, 255);
      doc.rect(margin, yPos - 5, contentWidth, 48, 'F');
      doc.setDrawColor(139, 92, 246);
      doc.setLineWidth(2);
      doc.line(margin, yPos - 5, margin, yPos + 43);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('The referee has consented to the following:', margin + 5, yPos);
      yPos += 7;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const consentItems = [
        `• Providing a professional reference for ${candidateName}`,
        '• Sharing information about their work history and performance',
        '• Acknowledging that their responses may be used in hiring decisions',
        '• Understanding that this reference is confidential'
      ];

      consentItems.forEach(item => {
        doc.text(item, margin + 5, yPos);
        yPos += 7;
      });
      yPos += 8;

      // Signature Section
      if (editingReferee.consent_signature) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text('Electronic Signature', margin, yPos);
        yPos += 10;

        // Draw light purple box for signature
        doc.setFillColor(245, 243, 255);
        doc.rect(margin, yPos - 5, contentWidth, 25, 'F');
        doc.setDrawColor(139, 92, 246);
        doc.setLineWidth(1);
        doc.rect(margin, yPos - 5, contentWidth, 25);

        doc.setFontSize(18);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(139, 92, 246);
        doc.text(editingReferee.consent_signature, margin + 5, yPos + 5);
        yPos += 12;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(`Signed electronically on ${signedDate}`, margin + 5, yPos + 5);
        yPos += 15;
      }

      // Footer
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, 270, pageWidth - margin, 270);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(`This document was generated on ${generatedDate}`, pageWidth / 2, 277, { align: 'center' });
      doc.text('Reference Check System - Official Referee Consent Record', pageWidth / 2, 282, { align: 'center' });

      // Save PDF
      const fileName = `Referee_Consent_${editingReferee.first_name}_${editingReferee.last_name}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('❌ Failed to generate PDF. Please try again or contact support.');
    }
  };

  const handleSaveCandidate = async () => {
    if (!editingCandidate) return;

    setSavingCandidate(true);
    try {
      const response = await fetch(`${apiUrl}/requests/${editingCandidate.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_first_name: editingCandidate.candidate_first_name,
          candidate_last_name: editingCandidate.candidate_last_name,
          candidate_email: editingCandidate.candidate_email,
          candidate_phone_number: editingCandidate.candidate_phone_number || null,
          position_applied_for: editingCandidate.position_applied_for,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update candidate');
      }

      // Optimistic UI update - immediately update local state
      setRequestsWithReferees(prev => prev.map(req => 
        req.id === editingCandidate.id
          ? {
              ...req,
              candidate_first_name: editingCandidate.candidate_first_name,
              candidate_last_name: editingCandidate.candidate_last_name,
              candidate_email: editingCandidate.candidate_email,
              candidate_phone_number: editingCandidate.candidate_phone_number || null,
              position_applied_for: editingCandidate.position_applied_for,
            }
          : req
      ));

      // Close modal and show success immediately
      setEditingCandidate(null);
      setSavingCandidate(false);
      alert('✅ Candidate details updated successfully!');
      
      // Refresh data in background (no await)
      fetchRequestsWithDetails(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      alert(`❌ Error: ${errorMessage}`);
      setSavingCandidate(false);
    }
  };

  useEffect(() => {
    fetchRequestsWithDetails();
  }, [userId, statusFilter]);

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (openRefereeMenuId && !(event.target as Element).closest('.actions-menu, .btn-action')) {
        setOpenRefereeMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openRefereeMenuId]);

  const getStatusBadgeClass = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: 'status-draft',
      sent: 'status-sent',
      completed: 'status-completed',
      expired: 'status-expired',
    };
    return statusMap[status] || 'status-default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRefereeStatusBadgeClass = (status: string, hasCompleted: boolean) => {
    if (hasCompleted || status === 'completed') {
      return 'status-completed';
    }
    if (status === 'bounced') {
      return 'status-bounced';
    }
    if (status === 'declined') {
      return 'status-bounced'; // Red styling for declined
    }
    if (status === 'started') {
      return 'status-sent';
    }
    return 'status-draft'; // pending
  };

  const getAuthorizationBadge = (req: RequestWithReferees) => {
    const status = req.authorization_status;
    const method = req.authorization_method;

    if (status === 'authorized' && method === 'online') {
      return (
        <span 
          className="status-badge status-completed"
          title="Authorized via online form"
        >
          Authorized
        </span>
      );
    }
    if (status === 'authorized' || status === 'verbal') {
      return (
        <span 
          className="status-badge status-completed"
          title="Verbally authorized by admin"
        >
          Authorized
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span 
          className="status-badge status-draft"
          title="Authorization email sent, awaiting response"
        >
          Auth Pending
        </span>
      );
    }
    return null; // Don't show anything if not authorized yet
  };

  if (loading) {
    return <div className="loading">Loading requests...</div>;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        {error}
        <button onClick={() => fetchRequestsWithDetails()} className="btn-retry">
          Retry
        </button>
      </div>
    );
  }

  // Show conversation view if active
  if (showingConversation) {
    const handleConversationComplete = () => {
      setShowingConversation(null);
      // Refresh the list to show updated completion status
      fetchRequestsWithDetails(false);
    };

    return (
      <div>
        <button
          onClick={handleConversationComplete}
          style={{
            margin: '20px',
            padding: '10px 20px',
            background: '#e5e7eb',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ← Back to Request List
        </button>
        <ConversationalReferenceCheck
          token={showingConversation.token}
          apiUrl={apiUrl}
          onComplete={handleConversationComplete}
        />
      </div>
    );
  }

  // Show report view if active
  if (showingReport) {
    return (
      <ReferenceReport
        requestId={showingReport.requestId}
        refereeId={showingReport.refereeId}
        apiUrl={apiUrl}
        onClose={() => setShowingReport(null)}
      />
    );
  }

  return (
    <div className="request-list">
      {/* Filter */}
      <div className="list-controls">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="search-input">🔍 Search:</label>
            <input
              id="search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Candidate or referee name..."
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '250px'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="status-filter">Filter by status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <button 
            onClick={() => fetchRequestsWithDetails(true)} 
            className="btn-refresh"
            disabled={loading}
          >
            {loading ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>

          {lastRefreshed && (
            <span style={{ fontSize: '12px', color: '#666' }}>
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Requests Table */}
      {requestsWithReferees.length === 0 ? (
        <div className="empty-state">
          <p>No reference requests found.</p>
          <p className="help-text">Create a new request to get started.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="requests-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('start_date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Start Date{renderSortIndicator('start_date')}
                </th>
                <th onClick={() => handleSort('candidate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Candidate{renderSortIndicator('candidate')}
                </th>
                <th onClick={() => handleSort('position')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Position{renderSortIndicator('position')}
                </th>
                <th>Referee Name</th>
                <th>Relationship</th>
                <th>Status</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredAndSortedData().map((req) => (
                <React.Fragment key={req.id}>
                  {/* If no referees, show one row for the candidate */}
                  {req.referees.length === 0 ? (
                    <tr>
                      <td>
                        {formatStartDate(req.authorization_sent_at)}
                      </td>
                      <td className="candidate-name">
                        <span
                          onClick={() => handleCandidateClick(req)}
                          style={{
                            color: '#2563eb',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                          title="Click to view/edit details"
                        >
                          {req.candidate_first_name} {req.candidate_last_name}
                        </span>
                      </td>
                      <td>{req.position_applied_for}</td>
                      <td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>
                        No referees added yet
                      </td>
                      <td>—</td>
                      <td style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => handleRefereeMenuClick(req.id, e)}
                          className="btn-action"
                          style={{ background: '#6366f1', color: 'white' }}
                        >
                          ⋯
                        </button>
                        {openRefereeMenuId === req.id && (
                          <div className={`actions-menu ${(menuPositions[req.id] || 'down') === 'up' ? 'actions-menu-up' : ''}`}>
                            {/* SECTION 1: Authorization Actions (if not authorized) */}
                            {(!req.authorization_status || req.authorization_status === 'pending') && (
                              <>
                                <button
                                  onClick={() => {
                                    setOpenRefereeMenuId(null);
                                    handleSendAuthorization(req.id, `${req.candidate_first_name} ${req.candidate_last_name}`);
                                  }}
                                  style={{ color: '#2563eb' }}
                                >
                                  📧 Send Authorization Email
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenRefereeMenuId(null);
                                    handleMarkVerbalAuthorization(req.id, `${req.candidate_first_name} ${req.candidate_last_name}`);
                                  }}
                                  style={{ color: '#10b981', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '8px' }}
                                >
                                  ✅ Mark Verbal Authorization
                                </button>
                              </>
                            )}
                            
                            {/* SECTION 2: Candidate Actions (always shown) */}
                            <button
                              onClick={() => {
                                setOpenRefereeMenuId(null);
                                onSelectRequest && onSelectRequest(req.id);
                              }}
                            >
                              ➕ Add Referee
                            </button>
                            <button
                              onClick={() => {
                                setOpenRefereeMenuId(null);
                                handleDeleteRequest(req.id, `${req.candidate_first_name} ${req.candidate_last_name}`);
                              }}
                              style={{ color: '#dc2626' }}
                            >
                              🗑️ Delete Candidate
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    /* Show one row per referee */
                    req.referees.map((referee, index) => (
                      <tr key={referee.id}>
                        {/* Show start date and candidate name only on first row */}
                        {index === 0 ? (
                          <>
                            <td
                              rowSpan={req.referees.length}
                              style={{ verticalAlign: 'top', paddingTop: '20px' }}
                            >
                              {formatStartDate(req.authorization_sent_at)}
                            </td>
                            <td
                              className="candidate-name"
                              rowSpan={req.referees.length}
                              style={{ verticalAlign: 'top', paddingTop: '20px' }}
                            >
                              <span
                                onClick={() => handleCandidateClick(req)}
                                style={{
                                  color: '#2563eb',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                }}
                                title="Click to view/edit details"
                              >
                                <strong>{req.candidate_first_name} {req.candidate_last_name}</strong>
                              </span>
                              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                {req.summary.completed}/{req.summary.total_referees} completed
                              </div>
                              <div style={{ marginTop: '8px' }}>
                                {getAuthorizationBadge(req)}
                              </div>
                            </td>
                            <td
                              rowSpan={req.referees.length}
                              style={{ verticalAlign: 'top', paddingTop: '20px' }}
                            >
                              {req.position_applied_for}
                            </td>
                          </>
                        ) : null}
                        <td>
                          <span
                            onClick={() => handleRefereeClick(referee)}
                            style={{
                              color: '#2563eb',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                            title="Click to view/edit details"
                          >
                            {referee.first_name} {referee.last_name}
                          </span>
                        </td>
                        <td>{referee.relationship}</td>
                        <td>
                          {(() => {
                            // Check if authorization is required
                            const isAwaitingAuth = req.authorization_status === 'pending';
                            const isNotAuthorized = !req.authorization_status || req.authorization_status === 'pending';
                            
                            // If awaiting authorization, show that status
                            if (isAwaitingAuth) {
                              return (
                                <>
                                  <span className="status-badge status-draft" style={{ background: '#fef5e7', color: '#856404' }}>
                                    Awaiting Auth
                                  </span>
                                  {req.authorization_sent_at && (
                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                      Sent {new Date(req.authorization_sent_at).toLocaleDateString('en-NZ', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        timeZone: 'Pacific/Auckland'
                                      })}
                                      {' '}
                                      {formatTimeNoLeadingZero(req.authorization_sent_at)}
                                    </div>
                                  )}
                                </>
                              );
                            }
                            
                            // If not authorized at all, show locked status
                            if (isNotAuthorized) {
                              return (
                                <>
                                  <span className="status-badge" style={{ background: '#fee', color: '#c00', border: '1px solid #fcc' }}>
                                    🔒 Auth Required
                                  </span>
                                </>
                              );
                            }
                            
                            // Check if a reminder was sent (last_contacted_at is after initial_sent_at)
                            const isReminder = !referee.has_completed && 
                              referee.last_contacted_at && 
                              referee.initial_sent_at && 
                              new Date(referee.last_contacted_at) > new Date(referee.initial_sent_at);
                            
                            const displayStatus = referee.has_completed
                              ? 'Completed'
                              : referee.status === 'bounced'
                                ? 'Bounced'
                                : referee.status === 'declined'
                                  ? 'Ref Declined'
                                  : isReminder
                                    ? 'Reminder'
                                    : referee.status === 'draft_ref' || referee.status === 'pending'
                                      ? 'Pending'
                                      : referee.status === 'started'
                                        ? 'Started'
                                        : referee.status === 'sent'
                                          ? 'Sent'
                                          : referee.status;
                            
                            return (
                              <>
                                <span className={`status-badge ${getRefereeStatusBadgeClass(referee.status, referee.has_completed)}`}>
                                  {displayStatus}
                                </span>
                                {referee.submitted_at && (
                                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                    {new Date(referee.submitted_at).toLocaleDateString('en-NZ', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      timeZone: 'Pacific/Auckland'
                                    })}
                                    {' '}
                                    {formatTimeNoLeadingZero(referee.submitted_at)}
                                  </div>
                                )}
                                {isReminder && referee.last_contacted_at && (
                                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                    {new Date(referee.last_contacted_at).toLocaleDateString('en-NZ', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      timeZone: 'Pacific/Auckland'
                                    })}
                                    {' '}
                                    {formatTimeNoLeadingZero(referee.last_contacted_at)}
                                  </div>
                                )}
                                {!referee.has_completed && !isReminder && (referee.last_contacted_at || referee.initial_sent_at) && (
                                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                    {new Date(referee.last_contacted_at || referee.initial_sent_at).toLocaleDateString('en-NZ', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      timeZone: 'Pacific/Auckland'
                                    })}
                                    {' '}
                                    {formatTimeNoLeadingZero(referee.last_contacted_at || referee.initial_sent_at)}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        {/* Combined Actions Column */}
                        <td style={{ position: 'relative' }}>
                        <button
                            onClick={(e) => handleRefereeMenuClick(referee.id, e)}
                      className="btn-action"
                            style={{ background: '#6366f1', color: 'white' }}
                          >
                            ⋯
                          </button>
                          {openRefereeMenuId === referee.id && (
                            <div className={`actions-menu ${(menuPositions[referee.id] || 'down') === 'up' ? 'actions-menu-up' : ''}`}>
                              {/* SECTION 1: Referee Actions (authorization-dependent) */}
                              {/* Hide referee actions if referee declined */}
                              {referee.status !== 'declined' && (
                                <>
                                  {req.authorization_status === 'authorized' || req.authorization_status === 'verbal' ? (
                                    <>
                                      {/* Authorized - Show referee-specific actions */}
                                      {(referee.has_completed || referee.status === 'completed') ? (
                                        <button
                                          onClick={() => {
                                            setOpenRefereeMenuId(null);
                                            // Navigate to professional report page
                                            window.location.href = `/report/${req.id}/referee/${referee.id}`;
                                          }}
                                          style={{
                                            color: '#6366f1',
                                            borderBottom: '1px solid #e5e7eb',
                                            paddingBottom: '8px',
                                            marginBottom: '8px'
                                          }}
                                        >
                                          👁️ View Report
                                        </button>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => {
                                              setOpenRefereeMenuId(null);
                                              handleSendReminder(req.id, referee.id, `${referee.first_name} ${referee.last_name}`);
                                            }}
                                            style={{ color: '#2563eb' }}
                                          >
                                            📧 Send Reminder
                                          </button>
                                          <button
                                            onClick={() => {
                                              setOpenRefereeMenuId(null);
                                              handleCompletePhoneReference(req.id, referee.id, `${referee.first_name} ${referee.last_name}`);
                                            }}
                                            style={{
                                              color: '#059669',
                                              borderBottom: '1px solid #e5e7eb',
                                              paddingBottom: '8px',
                                              marginBottom: '8px'
                                            }}
                                          >
                                            📞 Complete Over Phone
                                          </button>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {/* Not Authorized - Show message only */}
                                      <div style={{
                                        padding: '8px 12px',
                                        color: '#dc2626',
                                        fontSize: '13px',
                                        textAlign: 'center',
                                        borderBottom: '1px solid #e5e7eb',
                                        marginBottom: '8px'
                                      }}>
                                        🔒 Authorization Required
                                        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                          Candidate must authorize first
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </>
                              )}

                              {/* SECTION 2: Candidate-Level Actions (first referee row only) */}
                              {/* Hide authorization actions if referee declined */}
                              {index === 0 && referee.status !== 'declined' && (
                                <>
                                  {/* Authorization Actions (if not authorized) */}
                                  {(!req.authorization_status || req.authorization_status === 'pending') && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setOpenRefereeMenuId(null);
                                          handleSendAuthorization(req.id, `${req.candidate_first_name} ${req.candidate_last_name}`);
                                        }}
                                        style={{ color: '#2563eb' }}
                                      >
                                        📧 Send Authorization Email
                                      </button>
                                      <button
                                        onClick={() => {
                                          setOpenRefereeMenuId(null);
                                          handleMarkVerbalAuthorization(req.id, `${req.candidate_first_name} ${req.candidate_last_name}`);
                                        }}
                                        style={{ color: '#10b981', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '8px' }}
                                      >
                                        ✅ Mark Verbal Authorization
                                      </button>
                                    </>
                                  )}
                                </>
                              )}

                              {/* SECTION 3: Standard Candidate Actions (always shown on ALL rows) */}
                              <button
                                onClick={() => {
                                  setOpenRefereeMenuId(null);
                                  onSelectRequest && onSelectRequest(req.id);
                                }}
                              >
                                ➕ Add Referee
                              </button>
                              <button
                                onClick={() => {
                                  setOpenRefereeMenuId(null);
                                  handleDeleteRequest(req.id, `${req.candidate_first_name} ${req.candidate_last_name}`);
                                }}
                                style={{ color: '#dc2626' }}
                              >
                                🗑️ Delete Candidate
                              </button>
                            </div>
                          )}
                  </td>
                </tr>
                    ))
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Referee Edit Modal */}
      {editingReferee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setEditingReferee(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#1f2937' }}>
              Edit Referee Details
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                First Name *
                </label>
                <input
                  type="text"
                  value={editingReferee.first_name}
                  onChange={(e) => setEditingReferee({ ...editingReferee, first_name: e.target.value })}
                  style={{
                    width: '100%',
                  padding: '10px',
                    border: '1px solid #d1d5db',
                  borderRadius: '4px',
                    fontSize: '14px',
                  }}
                required
                />
              </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Last Name *
                </label>
                <input
                  type="text"
                  value={editingReferee.last_name}
                  onChange={(e) => setEditingReferee({ ...editingReferee, last_name: e.target.value })}
                  style={{
                    width: '100%',
                  padding: '10px',
                    border: '1px solid #d1d5db',
                  borderRadius: '4px',
                    fontSize: '14px',
                  }}
                required
                />
              </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Email *
                </label>
                <input
                  type="email"
                  value={editingReferee.email}
                  onChange={(e) => setEditingReferee({ ...editingReferee, email: e.target.value })}
                  style={{
                    width: '100%',
                  padding: '10px',
                    border: '1px solid #d1d5db',
                  borderRadius: '4px',
                    fontSize: '14px',
                  }}
                required
                />
              </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Phone
                </label>
                <input
                  type="tel"
                  value={editingReferee.phone || ''}
                  onChange={(e) => setEditingReferee({ ...editingReferee, phone: e.target.value })}
                  style={{
                    width: '100%',
                  padding: '10px',
                    border: '1px solid #d1d5db',
                  borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Relationship *
                </label>
                <input
                  type="text"
                  value={editingReferee.relationship}
                  onChange={(e) => setEditingReferee({ ...editingReferee, relationship: e.target.value })}
                  style={{
                    width: '100%',
                  padding: '10px',
                    border: '1px solid #d1d5db',
                  borderRadius: '4px',
                    fontSize: '14px',
                  }}
                placeholder="e.g. Manager, Colleague, Direct Report"
                required
                />
              </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Company/Organization
                </label>
                <input
                  type="text"
                  value={editingReferee.company || ''}
                  onChange={(e) => setEditingReferee({ ...editingReferee, company: e.target.value })}
                  style={{
                    width: '100%',
                  padding: '10px',
                    border: '1px solid #d1d5db',
                  borderRadius: '4px',
                    fontSize: '14px',
                  }}
                placeholder="e.g. Google, Acme Corp, or Personal Friend"
                />
              <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                Where you worked together (or context for personal references)
              </span>
              </div>

            {/* Referee Consent Information */}
            {editingReferee.consent_agreed && editingReferee.consent_signature && (
              <div style={{
                marginBottom: '24px',
                padding: '15px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '6px'
              }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600', color: '#166534' }}>
                  ✓ Consent Form Completed
                </h3>
                {editingReferee.consent_signed_at && (
                  <p style={{ margin: '5px 0', fontSize: '13px', color: '#166534' }}>
                    <strong>Date Signed:</strong> {new Date(editingReferee.consent_signed_at).toLocaleString('en-NZ', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Pacific/Auckland'
                    })}
                  </p>
                )}
                {editingReferee.consent_signature && (
                  <p style={{ margin: '5px 0', fontSize: '13px', color: '#166534' }}>
                    <strong>Signature:</strong> {editingReferee.consent_signature}
                  </p>
                )}
                <button
                  onClick={handleDownloadRefereeAuthorization}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📄 Download Consent Form
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingReferee(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReferee}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Edit Modal */}
      {editingCandidate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setEditingCandidate(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#1f2937' }}>
              Candidate Details
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                First Name *
                </label>
                <input
                  type="text"
                  value={editingCandidate.candidate_first_name}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, candidate_first_name: e.target.value })}
                  style={{
                    width: '100%',
                  padding: '10px',
                    border: '1px solid #d1d5db',
                  borderRadius: '4px',
                    fontSize: '14px',
                  }}
                required
                />
              </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Last Name *
                </label>
                <input
                  type="text"
                  value={editingCandidate.candidate_last_name}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, candidate_last_name: e.target.value })}
                  style={{
                    width: '100%',
                  padding: '10px',
                    border: '1px solid #d1d5db',
                  borderRadius: '4px',
                    fontSize: '14px',
                  }}
                required
                />
              </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Email *
                </label>
                <input
                  type="email"
                  value={editingCandidate.candidate_email}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, candidate_email: e.target.value })}
                  style={{
                    width: '100%',
                  padding: '10px',
                    border: '1px solid #d1d5db',
                  borderRadius: '4px',
                    fontSize: '14px',
                  }}
                required
                />
              </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Phone
                </label>
                <input
                  type="tel"
                  value={editingCandidate.candidate_phone_number || ''}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, candidate_phone_number: e.target.value })}
                  style={{
                    width: '100%',
                  padding: '10px',
                    border: '1px solid #d1d5db',
                  borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                Position Applied For *
                </label>
                <input
                  type="text"
                  value={editingCandidate.position_applied_for}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, position_applied_for: e.target.value })}
                  style={{
                    width: '100%',
                  padding: '10px',
                    border: '1px solid #d1d5db',
                  borderRadius: '4px',
                    fontSize: '14px',
                  }}
                required
                />
            </div>

            {/* Authorization Section */}
            {(editingCandidate.authorization_status === 'authorized' || editingCandidate.authorization_status === 'verbal') && (
              <div style={{
                marginBottom: '24px',
                padding: '15px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '6px'
              }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#15803d', fontSize: '16px' }}>
                  ✅ Authorization Complete
                </h3>
                <div style={{ fontSize: '14px', color: '#166534' }}>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Method:</strong> {editingCandidate.authorization_method === 'online' ? 'Online Form' : 'Verbal Authorization'}
                  </p>
                  {editingCandidate.authorization_completed_at && (
                    <p style={{ margin: '5px 0' }}>
                      <strong>Completed:</strong> {new Date(editingCandidate.authorization_completed_at).toLocaleString('en-NZ', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Pacific/Auckland'
                      })}
                    </p>
                  )}
                  {editingCandidate.authorization_signature && (
                    <p style={{ margin: '5px 0' }}>
                      <strong>Signature:</strong> {editingCandidate.authorization_signature}
                    </p>
                  )}
                  <button
                    onClick={handleDownloadAuthorization}
                    style={{
                      marginTop: '10px',
                      padding: '8px 16px',
                      backgroundColor: '#15803d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    📄 Download Authorization Form
                  </button>
                </div>
              </div>
            )}

            {editingCandidate.authorization_status === 'pending' && (
              <div style={{
                marginBottom: '24px',
                padding: '15px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '6px'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
                  ⏳ <strong>Authorization Pending</strong> - Waiting for candidate to complete authorization
                </p>
              </div>
            )}

            {!editingCandidate.authorization_status && (
              <div style={{
                marginBottom: '24px',
                padding: '15px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#991b1b' }}>
                  🔒 <strong>Authorization Required</strong> - Send authorization request before contacting referees
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingCandidate(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCandidate}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestList;

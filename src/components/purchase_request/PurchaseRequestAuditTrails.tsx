import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost } from '@/lib/apiFetch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare } from 'lucide-react';

interface AuditLog {
  _id: string;
  requestId: string;
  requestLabel: string;
  approver: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  role: 'prepared' | 'checked' | 'verified' | 'approved' | 'commented';
  department: string;
  status: 'pending' | 'completed' | 'skipped' | 'rejected' | 'approved' | 'revised';
  timestamp?: string;
  notes?: string;
  actionType: 'created' | 'submitted' | 'approved' | 'rejected' | 'modified' | 'cancelled' | 'commented' | 'revised';
  previousState?: any;
  newState?: any;
  createdAt: string;
}

interface PurchaseRequestAuditTrailsProps {
  requestId: string;
}

const PurchaseRequestAuditTrails: React.FC<PurchaseRequestAuditTrailsProps> = ({ requestId }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (!requestId) return;
      
      setLoading(true);
      try {
        const response = await apiGet(`/purchase-requests/${requestId}/audit-logs`);
        const result = await response.json();
        if (result.success) {
          setAuditLogs(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        toast({
          title: "Error",
          description: "Failed to load audit logs"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, [requestId, toast]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
 
    setSubmittingComment(true);
    try {
      const response = await apiPost(`/purchase-requests/${requestId}/audit-logs/comment`, {
        notes: commentText.trim()
      });
      const result = await response.json();
      
      if (result.success) {
        // Add the new comment to the logs
        setAuditLogs(prev => [result.data, ...prev]);
        setCommentText('');
        toast({
          title: "Success",
          description: "Comment added successfully"
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to add comment"
        });
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment"
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const getActionText = (log: AuditLog): string => {
    const actionMap: { [key: string]: string } = {
      'created': 'created',
      'submitted': 'submitted',
      'approved': 'approved',
      'rejected': 'rejected',
      'modified': 'modified',
      'cancelled': 'cancelled',
      'commented': 'commented on'
    };
    return actionMap[log.actionType] || log.actionType;
  };

  const getTextColor = (log: AuditLog): string => {
    if (log.actionType === 'commented') {
      return 'text-orange-600 dark:text-orange-400';
    }
    if (log.status === 'rejected' || log.actionType === 'cancelled') {
      return 'text-red-600 dark:text-red-400';
    }
    if (log.status === 'completed' || log.status === 'approved') {
      return 'text-green-600 dark:text-green-400';
    }
    if (log.status === 'revised'  || log.actionType === 'revised') {
      return 'text-blue-600 dark:text-bkue-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  };

  const formatTimestamp = (timestamp?: string): string => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-gray-500">Loading audit trail...</div>
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-gray-500">No audit logs available</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Audit Logs */}
      <div className="space-y-3">
        {auditLogs
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map((log, index) => {
            const userName = log.approver 
              ? `${log.approver.firstName} ${log.approver.lastName}`
              : 'Unknown User';
            const userDepartment = log.department || 'Unknown Department';
            const actionText = getActionText(log);
            const timestamp = formatTimestamp(log.timestamp || log.createdAt);
            const textColor = getTextColor(log);

            return (
              <div key={log._id} className="space-y-1">
                {/* Main audit trail line */}
                <div className={`text-sm ${textColor}`}>
                  <span className="font-medium">[{log.role.charAt(0).toUpperCase() + log.role.slice(1)}]</span>{' '}
                  <span className="font-medium">{userName}</span>{' '}
                  <span className="text-gray-500 dark:text-gray-400">({userDepartment})</span>{' '}
                  <span className="font-medium">{actionText}</span>{' '}
                  request{' '}
                  <span className="font-medium">{log.requestLabel}</span>
                  {timestamp && (
                    <span className="text-gray-500 dark:text-gray-400"> ({timestamp})</span>
                  )}
                </div>

                {/* Note section if present */}
                {log.notes && (
                  <div className={`ml-4 text-sm ${textColor} italic`}>
                    "{log.notes}"
                  </div>
                )}

                {/* State change details for modifications */}
                {/* {(log.actionType === 'modified' || log.actionType === 'approved' || log.actionType === 'rejected') && (
                  <div className="ml-4 text-xs text-gray-500 dark:text-gray-400">
                    <details>
                      <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                        State changes
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                        {JSON.stringify({ previous: log.previousState, new: log.newState }, null, 2)}
                      </pre>
                    </details>
                  </div>
                )} */}
              </div>
            );
          })}
      </div>

      {/* Comment Input Section */}
      <div className="border-t pt-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">Add Comment</span>
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Enter your comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAddComment}
                disabled={!commentText.trim() || submittingComment}
                size="sm"
              >
                {submittingComment ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseRequestAuditTrails;
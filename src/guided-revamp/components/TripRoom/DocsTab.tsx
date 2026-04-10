import { useState, useEffect } from 'react';
import { Upload, FileText, Download, Trash2, Loader, Search } from 'lucide-react';
import { TripRoomDocument } from '../../services/tripRoomService';
import { getRoomDocuments, uploadRoomDocument, deleteRoomDocument } from '../../services/tripRoomService';

interface DocsTabProps {
  roomId: string;
  isAgent: boolean;
}

export default function DocsTab({ roomId, isAgent }: DocsTabProps) {
  const [documents, setDocuments] = useState<TripRoomDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [roomId]);

  const loadDocuments = async () => {
    setLoading(true);
    const data = await getRoomDocuments(roomId);
    setDocuments(data);
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }

    setUploading(true);
    const result = await uploadRoomDocument(roomId, file, 'other');

    if (result.success) {
      await loadDocuments();
    } else {
      alert(`Failed to upload document: ${result.error}`);
    }

    setUploading(false);
    event.target.value = '';
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    const result = await deleteRoomDocument(docId);

    if (result.success) {
      await loadDocuments();
    } else {
      alert(`Failed to delete document: ${result.error}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getCategoryIcon = (category: string) => {
    return <FileText className="w-8 h-8 text-blue-600" />;
  };

  const groupedDocuments = documents.reduce((groups, doc) => {
    const category = doc.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(doc);
    return groups;
  }, {} as Record<string, TripRoomDocument[]>);

  const filteredDocuments = Object.entries(groupedDocuments).reduce((filtered, [category, docs]) => {
    const matchingDocs = docs.filter(doc =>
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (matchingDocs.length > 0) {
      filtered[category] = matchingDocs;
    }
    return filtered;
  }, {} as Record<string, TripRoomDocument[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Documents Center</h2>
        {isAgent && (
          <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors cursor-pointer">
            <Upload className="w-5 h-5" />
            <span>{uploading ? 'Uploading...' : 'Upload PDF'}</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search PDF documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {Object.keys(filteredDocuments).length === 0 ? (
        <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium">No documents found</p>
          {isAgent && <p className="text-sm mt-2">Upload your first document to get started</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredDocuments).map(([category, docs]) => (
            <div key={category}>
              <h3 className="text-sm font-bold text-gray-700 mb-3">{category}</h3>
              <div className="space-y-3">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        {getCategoryIcon(doc.category)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 mb-1 truncate">{doc.file_name}</h4>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)} • PDF
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded">
                              PDF
                            </span>
                            <a
                              href={doc.file_url}
                              download={doc.file_name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Download className="w-5 h-5" />
                            </a>
                            {isAgent && (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

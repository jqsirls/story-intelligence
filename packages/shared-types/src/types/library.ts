export type LibraryRole = 'Owner' | 'Admin' | 'Editor' | 'Viewer';

export interface Library {
  id: string;
  owner: string;
  name: string;
  parentLibrary?: string;
  createdAt: string;
}

export interface LibraryPermission {
  id: string;
  libraryId: string;
  userId: string;
  role: LibraryRole;
  grantedBy: string;
  createdAt: string;
}

export interface CreateLibraryRequest {
  name: string;
  parentLibraryId?: string;
}

export interface TransferLibraryRequest {
  libraryId: string;
  toUserId: string;
  role: LibraryRole;
}

export interface ManageRoleRequest {
  libraryId: string;
  userId: string;
  role: LibraryRole;
}
export interface IAdmin {
  firstName: string;
  lastName: string;
  // username: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
}

export enum Role {
  USER,
  SELLER,
  SERVICE_PROVIDER,
  ADMIN,

}

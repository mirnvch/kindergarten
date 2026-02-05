/**
 * Repository Layer — Data access abstractions.
 *
 * Repositories handle all database operations, providing a clean interface
 * between services and the database (Prisma).
 *
 * Architecture: Action → Service → Repository → Prisma/Database
 *
 * @example
 * // Using singleton instances (recommended)
 * import { userRepository, appointmentRepository } from "@/server/repositories";
 *
 * const user = await userRepository.findByEmail("test@example.com");
 * const appointments = await appointmentRepository.findByPatient(userId);
 *
 * @example
 * // Creating instances for testing (dependency injection)
 * import { UserRepository } from "@/server/repositories";
 *
 * class UserService {
 *   constructor(private userRepo = new UserRepository()) {}
 *
 *   async getUser(id: string) {
 *     return this.userRepo.findByIdSafe(id);
 *   }
 * }
 *
 * // In tests:
 * const mockRepo = { findByIdSafe: vi.fn() };
 * const service = new UserService(mockRepo as any);
 */

// Base repository
export {
  BaseRepository,
  SoftDeleteRepository,
  type FindOptions,
  type ListOptions,
  type PaginatedResult,
  type WhereClause,
} from "./base.repository";

// User repository
export {
  UserRepository,
  userRepository,
  type UserCreateInput,
  type UserUpdateInput,
  type UserWhereInput,
  type SafeUser,
  type UserListItem,
} from "./user.repository";

// Appointment repository
export {
  AppointmentRepository,
  appointmentRepository,
  type AppointmentCreateInput,
  type AppointmentUpdateInput,
  type AppointmentWhereInput,
  type AppointmentWithRelations,
  type TimeSlot,
} from "./appointment.repository";

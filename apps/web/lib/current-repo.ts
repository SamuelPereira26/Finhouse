import { SupabaseRepository } from './repository';

export function getRepo() {
  return new SupabaseRepository();
}

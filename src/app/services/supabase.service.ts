import { Injectable } from '@angular/core'
import {
  AuthChangeEvent,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js'
import { from, map, Observable } from 'rxjs'
import { supabase } from '../core/supabase'

export interface Profile {
  id?: string
  username: string
  website: string
  avatar_url: string
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private _supabase: SupabaseClient

  constructor() {
    this._supabase = supabase
  }

  get supabase(){
    return this._supabase;
  }

  getUser(): Observable<User | null> {
    return from(this.supabase.auth.getUser()).pipe(
      map(({ data, error }) => (error ? null : data.user)),
    )
  }

  profile(user: User) {
    return from(
      this.supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', user.id)
        .single(),
    )
  }

  authChanges(): Observable<{ event: AuthChangeEvent; session: Session | null }> {
    return new Observable(subscriber => {
      const { data: { subscription }} = this.supabase.auth.onAuthStateChange((event, session) => {
        subscriber.next({ event, session })
      })
      return () => subscription.unsubscribe()
    })
  }

  signIn(email: string) {
    return from(this.supabase.auth.signInWithOtp({ email }))
  }

  signInWithPassword(email: string, password: string) {
    return from(this.supabase.auth.signInWithPassword({ email, password }))
  }

  signOut() {
    return from(this.supabase.auth.signOut())
  }

  updateProfile(profile: Profile) {
    const update = {
      ...profile,
      updated_at: new Date(),
    }
    return from(this.supabase.from('profiles').upsert(update))
  }

  downLoadImage(path: string) {
    return from(this.supabase.storage.from('avatars').download(path))
  }

  uploadAvatar(filePath: string, file: File) {
    return from(this.supabase.storage.from('avatars').upload(filePath, file))
  }
}

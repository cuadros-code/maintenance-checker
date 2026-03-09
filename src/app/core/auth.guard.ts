import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

function waitForAuth() {
  const auth = inject(AuthStore);
  return toObservable(auth.initialized).pipe(
    filter(Boolean),
    take(1),
    map(() => auth.isAuthenticated())
  );
}

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return waitForAuth().pipe(
    map(isAuth => isAuth ? true : router.createUrlTree(['/login']))
  );
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return waitForAuth().pipe(
    map(isAuth => isAuth ? router.createUrlTree(['/dashboard']) : true)
  );
};
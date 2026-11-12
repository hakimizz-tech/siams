import { setAccessToken } from '@/lib/api/auth-token';
import { get, post } from '@/lib/api/endpoints';
import type { User } from '@/types/domain';

export interface LoginResponse {
    access: string;
    user?: User;
}

/** POST /auth/login/: returns the access token; the backend sets the HttpOnly refresh cookie. */
export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
    const data = await post<LoginResponse>('/api/v1/auth/login/', { body: { email, password } });
    setAccessToken(data.access);
    return data;
}

/** POST /auth/logout/: blacklists the refresh token. */
export const logoutRequest = () => post<void>('/api/v1/auth/logout/', {});

/** GET /users/me/ */
export const fetchMe = (signal?: AbortSignal) => get<User>('/api/v1/users/me/', { signal });

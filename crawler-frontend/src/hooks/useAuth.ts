import { useMutation } from '@tanstack/react-query';
import { login } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import type { Credential } from '../types/auth';

export const useLogin = () => {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ username, password }: Credential) =>
      login({ username, password }),
    onSuccess: (res) => {
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    },
  });
};

export const useRegister = () => {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ username, password, name }: Credential) =>
      login({ username, password, name }),
    onSuccess: (res) => {
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    },
  });
};

// My usual workflow is this:

// 1.	⁠User logs in, generates a JWT thats valid for like 10 minutes
// 2.	⁠Also generate a refresh token thats valid for like a day maybe
// 3.	⁠Store JWT in cookie for frontend (sent with every http request by configuring interceptor
// 4.	⁠Store refresh into httpOnly
// 5.	⁠Once JWT expires, the backend will know and it will have also received the refresh.
// 6.	⁠If JWT expired backend first checks if there's a refresh token, if so check its validity and generate a new JWT and refresh token while invalidating the old ones. On the frontend you have your interceptor check if the JWT that was sent back is still the same as the saved one in memory if not, replace it so that future requests use it.

// If the refresh isn't valid, simply return 403/401.

// Thats usually how I, and i think most, people use JWT. Short lived sessions so in case a JWT gets stolen it gets invalidated super quickly. And without a valid refresh token, you can't get a new one.

//  const stop = useCallback(async (url: string, bulkUrl?: string[]) => {
//     const ws = wsRef.current;

//     if (!ws) {
//       console.error('WebSocket not initialized');
//       return;
//     }

//     // 🔄 Wait until WebSocket is open
//     if (ws.readyState === WebSocket.CONNECTING) {
//       await new Promise<void>((resolve) => {
//         const waitForOpen = setInterval(() => {
//           if (ws.readyState === WebSocket.OPEN) {
//             clearInterval(waitForOpen);
//             resolve();
//           } else if (
//             ws.readyState === WebSocket.CLOSED ||
//             ws.readyState === WebSocket.CLOSING
//           ) {
//             clearInterval(waitForOpen);
//             console.error('WebSocket closed before connection was established');
//             resolve(); // or reject() if you want to handle it differently
//           }
//         }, 50);
//       });
//     }

//     return new Promise<void>((resolve) => {
//       const sendCancelMessage = (uri?: string) => {
//         try {
//           ws.send(
//             JSON.stringify({
//               action: 'cancel',
//               url: encodeURIComponent(url || (uri as string)),
//             }),
//           );

//           const handleMessage = (event: MessageEvent) => {
//             const message = JSON.parse(event.data);
//             if (message.status === 'cancelled') {
//               ws.removeEventListener('message', handleMessage);
//               resolve();
//             }
//           };

//           ws.addEventListener('message', handleMessage);

//           // Fallback timeout
//           setTimeout(() => {
//             ws.removeEventListener('message', handleMessage);
//             resolve();
//           }, 3000);
//         } catch (error) {
//           console.error('Error sending cancel message:', error);
//           resolve();
//         }
//       };
//       if (url) {
//         sendCancelMessage();
//         return;
//       }

//       if (bulkUrl) {
//         bulkUrl.forEach((url: string) => {
//           sendCancelMessage(url);
//         });
//         return;
//       }
//     });
//   }, []);

import express, { Request, Response } from 'express';
import { asyncRoute } from '../middlewares/asyncRoute';
import * as authService from '../services/authService';

const userRouter = express.Router();

userRouter.post(
  '/login',
  asyncRoute(async (req: Request, res: Response) => {
    const result = await authService.login(req.body?.email, req.body?.password);

    res.status(200).json(result);
  })
);

userRouter.post(
  '/logout',
  asyncRoute(async (req: Request, res: Response) => {
    await authService.logout(authService.readBearerToken(req.headers.authorization));

    res.status(200).json({ message: 'Logout successful' });
  })
);

export default userRouter;

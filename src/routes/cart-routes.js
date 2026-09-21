import { Router } from "express";
import {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
} from "../controllers/cart-controller.js";
import { verifyToken } from "../middleware/is-auth.js";
import validate from "../middleware/validation.js";
import {
  addCartItemValidator,
  updateCartItemValidator,
  removeCartItemValidator,
} from "../validators/cart-validator.js";

const router = Router();

router.use(verifyToken);

router.get("/", getCart);
router.post("/items", validate(addCartItemValidator), addItem);
router.patch("/items", validate(updateCartItemValidator), updateQuantity);
router.delete("/items", validate(removeCartItemValidator), removeItem);
router.delete("/", clearCart);

export default router;

import express from 'express';
import {
  getBills,
  createBill,
  updateBillStatus,
  deleteBill
} from '../controllers/billController.js';

const router = express.Router();

router.get('/', getBills);
router.post('/', createBill);
router.put('/:id/status', updateBillStatus);
router.delete('/:id', deleteBill);

export default router;

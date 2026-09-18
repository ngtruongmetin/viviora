const { z } = require('zod');

const typeSchema = z.enum(['MC', 'TF']);
const pointSchema = z.preprocess((value) => (value === '' || value === null || value === undefined ? 10 : value), z.coerce.number().int('Điểm phải là số nguyên.').finite('Điểm phải là số hợp lệ.').positive('Điểm phải lớn hơn 0.').max(100000, 'Điểm quá lớn.'));
const questionSchema = z.object({
  type: typeSchema,
  content: z.string().trim().min(1, 'Nội dung câu hỏi là bắt buộc.').max(5000),
  answerExplanation: z.string().trim().max(5000).optional().nullable(),
  options: z.array(z.object({ label: z.string().trim().min(1).max(1000), isCorrect: z.boolean() })).optional(),
  correctAnswer: z.boolean().optional(),
  point: pointSchema.default(10),
}).superRefine((value, ctx) => {
  if (value.type === 'MC') {
    if (!value.options || value.options.length !== 4) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Câu hỏi MC phải có đúng 4 đáp án.', path: ['options'] });
    else if (value.options.filter((option) => option.isCorrect).length !== 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Câu hỏi MC phải có đúng 1 đáp án đúng.', path: ['options'] });
  } else if (value.correctAnswer === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Câu hỏi TF phải có đáp án TRUE hoặc FALSE.', path: ['correctAnswer'] });
});

module.exports = { questionSchema, typeSchema };

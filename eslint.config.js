import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ ignores: ['node_modules/**', '.local/**'] }, js.configs.recommended, ...ts.configs.recommended);

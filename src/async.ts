// Part C - asynchronous code against a real database

import { pool } from './db.js';
import { findStudent, coursesFor, deleteStudent } from './queries.js';

export interface Overview {
  students: number;
  courses: number;
  departments: number;
}

// --- C1. Steps that depend on each other ----------------------------------

/**
 * The title of the first course a student takes, or undefined when the
 * student does not exist or takes nothing.
 *
 * Two steps, the second needing the first. Handle a missing student with
 * try/catch or with a check, and say in a comment which you chose and why.
 */
export async function firstCourseTitle(studentId: string): Promise<string | undefined> {
    const student = await findStudent(studentId);
    if (student) {
      return ((await coursesFor(student.id)).at(0)?.title)
    }
}
//  I handled a missing student by performing a check, 
//  because the function findStudent returns a Student or undefined 
//  The function findStudent do not throw any errors I could catch.


// --- C2. Steps that do not depend on each other ---------------------------

/**
 * Three counts: students, courses, departments.
 *
 * Write it twice. overviewSlowly does one query after another; overview
 * starts all three together. The runner times both.
 *
 * Use this query, and note the pg_sleep: each count is made to take about
 * 200 ms on purpose.
 *
 *     SELECT pg_sleep(0.2), count(*)::int AS total FROM student
 *
 * Without it the three counts against a local database finish in about a
 * millisecond each, and starting them together costs more than it saves,
 * because the pool has to open two more connections. Waiting is what makes
 * the difference visible, and on a real server the waiting is real.
 */
export async function overviewSlowly(): Promise<Overview> {
    let overview:Overview = { students:0, courses:0, departments:0 };
    const COUNT_STUDENTS = `SELECT pg_sleep(0.2), count(*)::int AS total FROM student`;
    const COUNT_COURSES = `SELECT pg_sleep(0.2), count(*)::int AS total FROM course`;
    const COUNT_DEPARTMENTS = `SELECT pg_sleep(0.2), count(*)::int AS total FROM department`;
    const students = await pool.query<Number>(`${COUNT_STUDENTS}`);
    const courses = await pool.query<Number>(`${COUNT_COURSES}`);
    const departments = await pool.query<Number>(`${COUNT_DEPARTMENTS}`);
    if (students.rows.length > 0) { overview.students = students.rows[0].valueOf()}; 
    if (courses.rows.length > 0) { overview.courses = courses.rows[0].valueOf()}; 
    if (departments.rows.length > 0) { overview.departments = departments.rows[0].valueOf()}; 
    return overview;
}

export async function overview(): Promise<Overview> {
  let overview:Overview = { students:0, courses:0, departments:0 };
  const COUNT_STUDENTS = `SELECT pg_sleep(0.2), count(*)::int AS total FROM student`;
  const COUNT_COURSES = `SELECT pg_sleep(0.2), count(*)::int AS total FROM course`;
  const COUNT_DEPARTMENTS = `SELECT pg_sleep(0.2), count(*)::int AS total FROM department`;
  const [students, courses, departments] = await Promise.all([
    pool.query<Number>(`${COUNT_STUDENTS}`),
    pool.query<Number>(`${COUNT_COURSES}`),
    pool.query<Number>(`${COUNT_DEPARTMENTS}`)
  ]);
  if (students.rows.length > 0) { overview.students = students.rows[0].valueOf()}; 
  if (courses.rows.length > 0) { overview.courses = courses.rows[0].valueOf()}; 
  if (departments.rows.length > 0) { overview.departments = departments.rows[0].valueOf()}; 
  return overview;
}

// --- C3. The forgotten await ----------------------------------------------

/**
 * Written for you, and wrong.
 *
 * It should delete a student and then report whether they are still there.
 * It reports that they are. Run it, explain in a comment what happens and
 * in which order, then write the corrected version below.
 *
 * There is a second problem, worse than the wrong answer: if the delete
 * fails, who finds out?
 */
export async function removeAndCheckBroken(id: string): Promise<boolean> {
  deleteStudent(id);
  const still = await findStudent(id);
  return still !== undefined;
}

/** The same thing, correct: false when the student is really gone. */
export async function removeAndCheck(id: string): Promise<boolean> {
  await deleteStudent(id);
  const still = await findStudent(id);
  return still !== undefined;
}

// 1) In function removeAndCheckBroken deleteStudent(id) is missing await
// 2) Code execution therefore proceeds immediately to the await findStudent(id) call, 
//    and the rest of the code is not executed until a Promise is returned.
//    Due to the missing await in the first deleteStudent(id) call, 
//    the deletion of the student does not occur until after the call to await findStudent(id).
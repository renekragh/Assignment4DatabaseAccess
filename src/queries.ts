// Part A - queries
//
// One thing to know before you start: this database stores grades on the
// American letter scale (A, A-, B+, ...), because that is the scale it came
// with. We use the Danish 7-point scale everywhere else, so the conversion
// happens in the database, in the danish_grade function you wrote in Task 5
// of the database exercises. Every query below that returns a grade calls it.
//
// Three rules for every query here:
//   values go in as $1, $2, never joined into the SQL text
//   columns are renamed for TypeScript: tot_cred AS "totCred"
//   numeric columns are cast: tot_cred::int, count(*)::int
//
// The module structure of the lesson Building the data access layer comes
// later; for this assignment one file is enough.

import { pool } from './db.js';

export interface Student {
  id: string;
  name: string;
  deptName: string;
  totCred: number;
}

export interface CourseRow {
  courseId: string;
  title: string;
  grade: string | null;
}

export interface DeptCount {
  deptName: string;
  students: number;
}

// --- A1. Reading ----------------------------------------------------------

/** A page of students, ordered by id. */
export async function listStudents(limit: number, offset: number): Promise<Student[]> {
  const SELECT_STUDENT = `SELECT id, name, dept_name AS "deptName", tot_cred AS "totCred" 
                          FROM student`;
  const { rows } = await pool.query<Student>(`${SELECT_STUDENT} ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
  return rows;
}

/** One student, or undefined when there is no such id. */
export async function findStudent(id: string): Promise<Student | undefined> {
  const SELECT_STUDENT = `SELECT id, name, dept_name AS "deptName", tot_cred AS "totCred" 
                          FROM student`;
  const { rows } = await pool.query<Student>(`${SELECT_STUDENT} WHERE id = $1`, [id]);
  return rows.length > 0 ? rows[0] : undefined;
}

/** The students of one department, ordered by name. */
export async function studentsIn(deptName: string): Promise<Student[]> {
  const SELECT_STUDENT = `SELECT id, name, dept_name AS "deptName", tot_cred AS "totCred" 
                          FROM student`;
  const { rows } = await pool.query<Student>(`${SELECT_STUDENT} WHERE dept_name = $1 ORDER BY name`, [deptName]);
  return rows;
}

// --- A2. A join -----------------------------------------------------------

/**
 * The courses a student takes, with the grade, ordered by course id.
 * Two tables: takes and course. A student who takes nothing gives an empty
 * array, not an error.
 *
 * The grade must come back on the Danish scale, so call danish_grade from
 * the database exercises inside the query:
 *
 *     SELECT ..., danish_grade(t.grade) AS grade
 */
export async function coursesFor(studentId: string): Promise<CourseRow[]> {
  const SELECT_TAKES_COURSES = `SELECT c.course_id, c.title, danish_grade(t.grade) AS grade
                                FROM course c
                                JOIN takes t ON c.course_id = t.course_id`;
  const { rows } = await pool.query<CourseRow>(`${SELECT_TAKES_COURSES} WHERE t.id = $1 ORDER BY course_id`, [studentId]);
  return rows;
}

// --- A3. Aggregating ------------------------------------------------------

/**
 * How many students each department has, ordered by department name.
 * Without the cast, count(*) arrives as a string. Try it both ways and
 * look at the type of what you get.
 */
export async function studentsPerDepartment(): Promise<DeptCount[]> {
  // count(*) returns type bigint in Postgresql, but node-postgres library will return a string.
  const SELECT_STUDENTS_IN_EACH_DEPARTMENT = `SELECT dept_name AS deptName, COUNT(*)::int AS students 
                                              FROM student 
                                              GROUP BY deptName`
  const { rows } = await pool.query<DeptCount>(`${SELECT_STUDENTS_IN_EACH_DEPARTMENT} ORDER BY deptName`);
  return rows;
}

// --- A4. Writing ----------------------------------------------------------

/** Stores a student and returns the row the database stored. */
export async function insertStudent(student: Student): Promise<Student> {
  const INSERT_STUDENT = `INSERT INTO student (id, name, dept_name, tot_cred)`;
  const { rows } = await pool.query<Student>(`${INSERT_STUDENT} VALUES ($1, $2, $3, $4) 
                                                                RETURNING id, name, dept_name AS "deptName", tot_cred AS "totCred"`, 
                                                                [student.id, student.name, student.deptName, student.totCred]);
  return rows[0];
}

/** True when a row was deleted, false when there was nothing to delete. */
export async function deleteStudent(id: string): Promise<boolean> {
  const DELETE_STUDENT = `DELETE FROM student`;
  const result = await pool.query(`${DELETE_STUDENT} WHERE id=$1`, [id]);
  return result.rowCount === 0 ? false : true;
}
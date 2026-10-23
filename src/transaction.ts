// Part B1 - one operation, two statements, one transaction

import { QueryResult } from 'pg';
import { pool } from './db.js';
import { CourseRow, Student } from './queries.js';

export interface EnrolInput {
  studentId: string;
  courseId: string;
  secId: string;
  semester: string;
  year: number;
}

export interface CourseCredits {
  credits: number;
}

/**
 * Enrols a student in a course section and adds the course credits to the
 * student's total.
 *
 * Two statements:
 *   INSERT INTO takes (id, course_id, sec_id, semester, year, grade)
 *     VALUES ($1, $2, $3, $4, $5, NULL)
 *   UPDATE student SET tot_cred = tot_cred + <the course credits>
 *     WHERE id = $1
 *
 * They must both happen or neither. A student enrolled without the credits
 * being added is a database that quietly disagrees with itself.
 *
 * A transaction runs on one connection, so take a client from the pool
 * rather than using the pool directly: BEGIN, both statements, COMMIT, and
 * ROLLBACK if anything fails. Release the client in a finally block.
 *
 * Returns the student's new credit total.
 */
export async function enrolInTypeScript(input: EnrolInput): Promise<number> {
  const INSERT_INTO_TAKES = `INSERT INTO takes(id, course_id, sec_id, semester, year, grade) VALUES ($1, $2, $3, $4, $5, NULL)`;
  const UPDATE_STUDENT = `UPDATE student SET tot_cred = tot_cred +`;
  const SELECT_COURSE_CREDITS = `SELECT credits FROM course WHERE course_id=$1`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`${INSERT_INTO_TAKES}`, [input.studentId, input.courseId, input.secId, input.semester, input.year]);
    const { rows } = await pool.query<CourseCredits>(`${SELECT_COURSE_CREDITS}`, [input.courseId]);
    const result = await client.query<Student>(`${UPDATE_STUDENT}` + rows[0].credits + ` WHERE id=$1 RETURNING tot_cred AS "totCred"`, [input.studentId]);
    await client.query('COMMIT');
    return result.rows[0].totCred;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Part B2 and B3 - calling what you wrote in the database
//
// Write the routines in procedures.sql first, in pgAdmin. Calling them is an
// ordinary query: a FUNCTION goes inside a SELECT, a PROCEDURE uses CALL.

import { Query, QueryResult } from 'pg';
import { pool } from './db.js';

export interface TranscriptRow {
  courseId: string;
  title: string;
  grade: string | null;
}

export interface NoStudentErr {
  errMessage: string;
}

/**
 * The transcript of a student, from the stored function:
 *
 *     SELECT * FROM student_transcript($1)
 *
 * The function raises an exception for an unknown student, which arrives
 * here as a rejected promise. Let it travel on: this one throws.
 */
export async function transcriptOf(studentId: string): Promise<TranscriptRow[]> {
  const { rows } = await pool.query<TranscriptRow>('SELECT * FROM student_transcript($1)', [studentId]);
  return rows;
}

/**
 * The same, but undefined instead of an error when the student does not
 * exist.
 *
 * An exception you raised yourself arrives with err.code === 'P0001'. Any
 * other code is a real failure and must be re-thrown rather than swallowed:
 * a syntax error in your SQL is not "no such student".
 */
export async function transcriptOrUndefined(studentId: string): Promise<TranscriptRow[] | undefined> {
    try {
      const { rows } = await pool.query<TranscriptRow>('SELECT * FROM student_transcript($1)', [studentId]);
      return rows
    } catch (err) {
      // if (err.code === 'P0001') return undefined;
      if ((err as Error).message.includes('No student with id')) return undefined;
      throw new Error((err as Error).message);
    }
}

/**
 * Enrols a student by calling the stored procedure:
 *
 *     CALL enrol_student($1, $2, $3, $4, $5, NULL)
 *
 * The INOUT parameter comes back as a row. Note that tot_cred is numeric, so
 * the new total arrives as a string: convert it.
 *
 * Returns the new credit total.
 */
export async function enrolWithProcedure(
  studentId: string, courseId: string, secId: string, semester: string, year: number): Promise<number> {
  const { rows } = await pool.query( 'CALL enrol_student($1, $2, $3, $4, $5, NULL)', [studentId, courseId, secId, semester, year]);
  return rows[0].new_total;
}
// B1 Gives no transaction by default and the logic is kept in the program.
// B3 Stored procedure give me transaction by default and also the logic is kept in the database.
// For more complex logic I think that store procedures is more optimized for performance.
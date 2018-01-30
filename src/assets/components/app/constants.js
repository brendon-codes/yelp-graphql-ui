
// @flow

/**
 * Various constants used throughout the app
 * are located here.
 */

export const BIZ_SEARCH_LIMIT: number = 20;
export const BIZ_DISPLAY_LIMIT: number = 20;
export const CAT_SEARCH_LIMIT: number = 10;
export const CAT_CLEAN_RE: RegExp = new RegExp("[^A-Za-z0-9]+", "g");
export const DISTANCE_MILES_MAX: number = 25;
export const DISTANCE_METERS_MAX: number = 40000;
export const DISTANCE_METERS_PER_MILE: number = 1609.344;
export const DISTANCE_DEFAULT: number = 1;
export const ZIP_DEFAULT: string = "90402";
export const INITIAL_FETCH_MODE: string = "search";


import fs from "node:fs";
import path from "node:path";

export type TranslationStatus =
	| "translated"
	| "partially_translated"
	| "untranslated"
	| "community";

export type TranslationStatusMap = {
	[route: string]: TranslationStatus;
};

const TRANSLATION_STATUS_FILE = path.resolve(
	process.cwd(),
	"translation-status.json",
);

/**
 * ページの翻訳状態を管理しているJSONファイルを読み込む。ファイルが存在しない場合は空のオブジェクトを返す。
 * @returns ページの翻訳状態を示すオブジェクト。
 */
export const loadTranslationStatus = (): TranslationStatusMap => {
	if (fs.existsSync(TRANSLATION_STATUS_FILE)) {
		const content = fs.readFileSync(TRANSLATION_STATUS_FILE, "utf-8");
		return JSON.parse(content);
	}

	return {};
};

/**
 * ページの翻訳状態を管理しているJSONファイルに書き込む。
 * @param status ページの翻訳状態を示すオブジェクト。
 */
export const saveTranslationStatus = (status: TranslationStatusMap): void => {
	const json = {
		$schema: "./translation-status.schema.json",
		...status,
	};
	fs.writeFileSync(
		TRANSLATION_STATUS_FILE,
		JSON.stringify(json, null, 2),
		"utf-8",
	);
};

/**
 * 新規ページのルートを未翻訳として登録する。既に登録されているルートは無視される。
 * @param routes 登録するページのルートの配列。
 */
export const registerRoutes = (routes: string[]): void => {
	const status = loadTranslationStatus();
	let changed = false;

	for (const route of routes) {
		if (!(route in status)) {
			status[route] = "untranslated";
			changed = true;
		}
	}

	if (changed) {
		saveTranslationStatus(status);
	}
};

/**
 * 翻訳の進捗率を計算する。
 * `translated`は1.0、`partially_translated`は0.5の重みを持つ。
 * `original`は翻訳対象外のため計算から除外される。
 * @returns [0.0, 1.0]の範囲で表される翻訳率
 */
export const calculateTranslationProgressRate = (): number => {
	const status = loadTranslationStatus();
	const routes = Object.keys(status).filter((key) => key !== "$schema");
	const translationTargetRoutes = routes.filter(
		(route) => status[route] !== "community",
	);

	if (translationTargetRoutes.length === 0) {
		return 0;
	}

	let translationScore = 0;

	for (const route of translationTargetRoutes) {
		const currentStatus = status[route];
		if (currentStatus === "translated") {
			translationScore += 1;
		} else if (currentStatus === "partially_translated") {
			translationScore += 0.5;
		}
	}

	return translationScore / translationTargetRoutes.length;
};

let translationStatusCache: TranslationStatusMap | null = null;

/**
 * 指定されたルートの翻訳状態を取得する。
 * @param route 翻訳状態を取得するページのルート
 * @returns 翻訳状態。存在しない場合は"untranslated"を返す。
 */
export const getTranslationStatus = (route: string): TranslationStatus => {
	if (translationStatusCache === null) {
		translationStatusCache = loadTranslationStatus();
	}
	return translationStatusCache[route] || "untranslated";
};

window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-agent-rp",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_dom_client = require("react-dom/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region node_modules/.pnpm/dompurify@3.3.0/node_modules/dompurify/dist/purify.es.mjs
		/*! @license DOMPurify 3.3.0 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.3.0/LICENSE */
		const { entries: entries$1, setPrototypeOf, isFrozen, getPrototypeOf, getOwnPropertyDescriptor } = Object;
		let { freeze, seal, create } = Object;
		let { apply: apply$1, construct } = typeof Reflect !== "undefined" && Reflect;
		if (!freeze) freeze = function freeze(x) {
			return x;
		};
		if (!seal) seal = function seal(x) {
			return x;
		};
		if (!apply$1) apply$1 = function apply(func, thisArg) {
			for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) args[_key - 2] = arguments[_key];
			return func.apply(thisArg, args);
		};
		if (!construct) construct = function construct(Func) {
			for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) args[_key2 - 1] = arguments[_key2];
			return new Func(...args);
		};
		const arrayForEach = unapply(Array.prototype.forEach);
		const arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
		const arrayPop = unapply(Array.prototype.pop);
		const arrayPush = unapply(Array.prototype.push);
		const arraySplice = unapply(Array.prototype.splice);
		const stringToLowerCase = unapply(String.prototype.toLowerCase);
		const stringToString = unapply(String.prototype.toString);
		const stringMatch = unapply(String.prototype.match);
		const stringReplace = unapply(String.prototype.replace);
		const stringIndexOf = unapply(String.prototype.indexOf);
		const stringTrim = unapply(String.prototype.trim);
		const objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
		const regExpTest = unapply(RegExp.prototype.test);
		const typeErrorCreate = unconstruct(TypeError);
		/**
		* Creates a new function that calls the given function with a specified thisArg and arguments.
		*
		* @param func - The function to be wrapped and called.
		* @returns A new function that calls the given function with a specified thisArg and arguments.
		*/
		function unapply(func) {
			return function(thisArg) {
				if (thisArg instanceof RegExp) thisArg.lastIndex = 0;
				for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) args[_key3 - 1] = arguments[_key3];
				return apply$1(func, thisArg, args);
			};
		}
		/**
		* Creates a new function that constructs an instance of the given constructor function with the provided arguments.
		*
		* @param func - The constructor function to be wrapped and called.
		* @returns A new function that constructs an instance of the given constructor function with the provided arguments.
		*/
		function unconstruct(Func) {
			return function() {
				for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) args[_key4] = arguments[_key4];
				return construct(Func, args);
			};
		}
		/**
		* Add properties to a lookup table
		*
		* @param set - The set to which elements will be added.
		* @param array - The array containing elements to be added to the set.
		* @param transformCaseFunc - An optional function to transform the case of each element before adding to the set.
		* @returns The modified set with added elements.
		*/
		function addToSet(set, array) {
			let transformCaseFunc = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : stringToLowerCase;
			if (setPrototypeOf) setPrototypeOf(set, null);
			let l = array.length;
			while (l--) {
				let element = array[l];
				if (typeof element === "string") {
					const lcElement = transformCaseFunc(element);
					if (lcElement !== element) {
						if (!isFrozen(array)) array[l] = lcElement;
						element = lcElement;
					}
				}
				set[element] = true;
			}
			return set;
		}
		/**
		* Clean up an array to harden against CSPP
		*
		* @param array - The array to be cleaned.
		* @returns The cleaned version of the array
		*/
		function cleanArray(array) {
			for (let index = 0; index < array.length; index++) if (!objectHasOwnProperty(array, index)) array[index] = null;
			return array;
		}
		/**
		* Shallow clone an object
		*
		* @param object - The object to be cloned.
		* @returns A new object that copies the original.
		*/
		function clone$1(object) {
			const newObject = create(null);
			for (const [property, value] of entries$1(object)) if (objectHasOwnProperty(object, property)) if (Array.isArray(value)) newObject[property] = cleanArray(value);
			else if (value && typeof value === "object" && value.constructor === Object) newObject[property] = clone$1(value);
			else newObject[property] = value;
			return newObject;
		}
		/**
		* This method automatically checks if the prop is function or getter and behaves accordingly.
		*
		* @param object - The object to look up the getter function in its prototype chain.
		* @param prop - The property name for which to find the getter function.
		* @returns The getter function found in the prototype chain or a fallback function.
		*/
		function lookupGetter(object, prop) {
			while (object !== null) {
				const desc = getOwnPropertyDescriptor(object, prop);
				if (desc) {
					if (desc.get) return unapply(desc.get);
					if (typeof desc.value === "function") return unapply(desc.value);
				}
				object = getPrototypeOf(object);
			}
			function fallbackValue() {
				return null;
			}
			return fallbackValue;
		}
		const html$1 = freeze([
			"a",
			"abbr",
			"acronym",
			"address",
			"area",
			"article",
			"aside",
			"audio",
			"b",
			"bdi",
			"bdo",
			"big",
			"blink",
			"blockquote",
			"body",
			"br",
			"button",
			"canvas",
			"caption",
			"center",
			"cite",
			"code",
			"col",
			"colgroup",
			"content",
			"data",
			"datalist",
			"dd",
			"decorator",
			"del",
			"details",
			"dfn",
			"dialog",
			"dir",
			"div",
			"dl",
			"dt",
			"element",
			"em",
			"fieldset",
			"figcaption",
			"figure",
			"font",
			"footer",
			"form",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"head",
			"header",
			"hgroup",
			"hr",
			"html",
			"i",
			"img",
			"input",
			"ins",
			"kbd",
			"label",
			"legend",
			"li",
			"main",
			"map",
			"mark",
			"marquee",
			"menu",
			"menuitem",
			"meter",
			"nav",
			"nobr",
			"ol",
			"optgroup",
			"option",
			"output",
			"p",
			"picture",
			"pre",
			"progress",
			"q",
			"rp",
			"rt",
			"ruby",
			"s",
			"samp",
			"search",
			"section",
			"select",
			"shadow",
			"slot",
			"small",
			"source",
			"spacer",
			"span",
			"strike",
			"strong",
			"style",
			"sub",
			"summary",
			"sup",
			"table",
			"tbody",
			"td",
			"template",
			"textarea",
			"tfoot",
			"th",
			"thead",
			"time",
			"tr",
			"track",
			"tt",
			"u",
			"ul",
			"var",
			"video",
			"wbr"
		]);
		const svg$1 = freeze([
			"svg",
			"a",
			"altglyph",
			"altglyphdef",
			"altglyphitem",
			"animatecolor",
			"animatemotion",
			"animatetransform",
			"circle",
			"clippath",
			"defs",
			"desc",
			"ellipse",
			"enterkeyhint",
			"exportparts",
			"filter",
			"font",
			"g",
			"glyph",
			"glyphref",
			"hkern",
			"image",
			"inputmode",
			"line",
			"lineargradient",
			"marker",
			"mask",
			"metadata",
			"mpath",
			"part",
			"path",
			"pattern",
			"polygon",
			"polyline",
			"radialgradient",
			"rect",
			"stop",
			"style",
			"switch",
			"symbol",
			"text",
			"textpath",
			"title",
			"tref",
			"tspan",
			"view",
			"vkern"
		]);
		const svgFilters = freeze([
			"feBlend",
			"feColorMatrix",
			"feComponentTransfer",
			"feComposite",
			"feConvolveMatrix",
			"feDiffuseLighting",
			"feDisplacementMap",
			"feDistantLight",
			"feDropShadow",
			"feFlood",
			"feFuncA",
			"feFuncB",
			"feFuncG",
			"feFuncR",
			"feGaussianBlur",
			"feImage",
			"feMerge",
			"feMergeNode",
			"feMorphology",
			"feOffset",
			"fePointLight",
			"feSpecularLighting",
			"feSpotLight",
			"feTile",
			"feTurbulence"
		]);
		const svgDisallowed = freeze([
			"animate",
			"color-profile",
			"cursor",
			"discard",
			"font-face",
			"font-face-format",
			"font-face-name",
			"font-face-src",
			"font-face-uri",
			"foreignobject",
			"hatch",
			"hatchpath",
			"mesh",
			"meshgradient",
			"meshpatch",
			"meshrow",
			"missing-glyph",
			"script",
			"set",
			"solidcolor",
			"unknown",
			"use"
		]);
		const mathMl$1 = freeze([
			"math",
			"menclose",
			"merror",
			"mfenced",
			"mfrac",
			"mglyph",
			"mi",
			"mlabeledtr",
			"mmultiscripts",
			"mn",
			"mo",
			"mover",
			"mpadded",
			"mphantom",
			"mroot",
			"mrow",
			"ms",
			"mspace",
			"msqrt",
			"mstyle",
			"msub",
			"msup",
			"msubsup",
			"mtable",
			"mtd",
			"mtext",
			"mtr",
			"munder",
			"munderover",
			"mprescripts"
		]);
		const mathMlDisallowed = freeze([
			"maction",
			"maligngroup",
			"malignmark",
			"mlongdiv",
			"mscarries",
			"mscarry",
			"msgroup",
			"mstack",
			"msline",
			"msrow",
			"semantics",
			"annotation",
			"annotation-xml",
			"mprescripts",
			"none"
		]);
		const text$1 = freeze(["#text"]);
		const html = freeze([
			"accept",
			"action",
			"align",
			"alt",
			"autocapitalize",
			"autocomplete",
			"autopictureinpicture",
			"autoplay",
			"background",
			"bgcolor",
			"border",
			"capture",
			"cellpadding",
			"cellspacing",
			"checked",
			"cite",
			"class",
			"clear",
			"color",
			"cols",
			"colspan",
			"controls",
			"controlslist",
			"coords",
			"crossorigin",
			"datetime",
			"decoding",
			"default",
			"dir",
			"disabled",
			"disablepictureinpicture",
			"disableremoteplayback",
			"download",
			"draggable",
			"enctype",
			"enterkeyhint",
			"exportparts",
			"face",
			"for",
			"headers",
			"height",
			"hidden",
			"high",
			"href",
			"hreflang",
			"id",
			"inert",
			"inputmode",
			"integrity",
			"ismap",
			"kind",
			"label",
			"lang",
			"list",
			"loading",
			"loop",
			"low",
			"max",
			"maxlength",
			"media",
			"method",
			"min",
			"minlength",
			"multiple",
			"muted",
			"name",
			"nonce",
			"noshade",
			"novalidate",
			"nowrap",
			"open",
			"optimum",
			"part",
			"pattern",
			"placeholder",
			"playsinline",
			"popover",
			"popovertarget",
			"popovertargetaction",
			"poster",
			"preload",
			"pubdate",
			"radiogroup",
			"readonly",
			"rel",
			"required",
			"rev",
			"reversed",
			"role",
			"rows",
			"rowspan",
			"spellcheck",
			"scope",
			"selected",
			"shape",
			"size",
			"sizes",
			"slot",
			"span",
			"srclang",
			"start",
			"src",
			"srcset",
			"step",
			"style",
			"summary",
			"tabindex",
			"title",
			"translate",
			"type",
			"usemap",
			"valign",
			"value",
			"width",
			"wrap",
			"xmlns",
			"slot"
		]);
		const svg = freeze([
			"accent-height",
			"accumulate",
			"additive",
			"alignment-baseline",
			"amplitude",
			"ascent",
			"attributename",
			"attributetype",
			"azimuth",
			"basefrequency",
			"baseline-shift",
			"begin",
			"bias",
			"by",
			"class",
			"clip",
			"clippathunits",
			"clip-path",
			"clip-rule",
			"color",
			"color-interpolation",
			"color-interpolation-filters",
			"color-profile",
			"color-rendering",
			"cx",
			"cy",
			"d",
			"dx",
			"dy",
			"diffuseconstant",
			"direction",
			"display",
			"divisor",
			"dur",
			"edgemode",
			"elevation",
			"end",
			"exponent",
			"fill",
			"fill-opacity",
			"fill-rule",
			"filter",
			"filterunits",
			"flood-color",
			"flood-opacity",
			"font-family",
			"font-size",
			"font-size-adjust",
			"font-stretch",
			"font-style",
			"font-variant",
			"font-weight",
			"fx",
			"fy",
			"g1",
			"g2",
			"glyph-name",
			"glyphref",
			"gradientunits",
			"gradienttransform",
			"height",
			"href",
			"id",
			"image-rendering",
			"in",
			"in2",
			"intercept",
			"k",
			"k1",
			"k2",
			"k3",
			"k4",
			"kerning",
			"keypoints",
			"keysplines",
			"keytimes",
			"lang",
			"lengthadjust",
			"letter-spacing",
			"kernelmatrix",
			"kernelunitlength",
			"lighting-color",
			"local",
			"marker-end",
			"marker-mid",
			"marker-start",
			"markerheight",
			"markerunits",
			"markerwidth",
			"maskcontentunits",
			"maskunits",
			"max",
			"mask",
			"mask-type",
			"media",
			"method",
			"mode",
			"min",
			"name",
			"numoctaves",
			"offset",
			"operator",
			"opacity",
			"order",
			"orient",
			"orientation",
			"origin",
			"overflow",
			"paint-order",
			"path",
			"pathlength",
			"patterncontentunits",
			"patterntransform",
			"patternunits",
			"points",
			"preservealpha",
			"preserveaspectratio",
			"primitiveunits",
			"r",
			"rx",
			"ry",
			"radius",
			"refx",
			"refy",
			"repeatcount",
			"repeatdur",
			"restart",
			"result",
			"rotate",
			"scale",
			"seed",
			"shape-rendering",
			"slope",
			"specularconstant",
			"specularexponent",
			"spreadmethod",
			"startoffset",
			"stddeviation",
			"stitchtiles",
			"stop-color",
			"stop-opacity",
			"stroke-dasharray",
			"stroke-dashoffset",
			"stroke-linecap",
			"stroke-linejoin",
			"stroke-miterlimit",
			"stroke-opacity",
			"stroke",
			"stroke-width",
			"style",
			"surfacescale",
			"systemlanguage",
			"tabindex",
			"tablevalues",
			"targetx",
			"targety",
			"transform",
			"transform-origin",
			"text-anchor",
			"text-decoration",
			"text-rendering",
			"textlength",
			"type",
			"u1",
			"u2",
			"unicode",
			"values",
			"viewbox",
			"visibility",
			"version",
			"vert-adv-y",
			"vert-origin-x",
			"vert-origin-y",
			"width",
			"word-spacing",
			"wrap",
			"writing-mode",
			"xchannelselector",
			"ychannelselector",
			"x",
			"x1",
			"x2",
			"xmlns",
			"y",
			"y1",
			"y2",
			"z",
			"zoomandpan"
		]);
		const mathMl = freeze([
			"accent",
			"accentunder",
			"align",
			"bevelled",
			"close",
			"columnsalign",
			"columnlines",
			"columnspan",
			"denomalign",
			"depth",
			"dir",
			"display",
			"displaystyle",
			"encoding",
			"fence",
			"frame",
			"height",
			"href",
			"id",
			"largeop",
			"length",
			"linethickness",
			"lspace",
			"lquote",
			"mathbackground",
			"mathcolor",
			"mathsize",
			"mathvariant",
			"maxsize",
			"minsize",
			"movablelimits",
			"notation",
			"numalign",
			"open",
			"rowalign",
			"rowlines",
			"rowspacing",
			"rowspan",
			"rspace",
			"rquote",
			"scriptlevel",
			"scriptminsize",
			"scriptsizemultiplier",
			"selection",
			"separator",
			"separators",
			"stretchy",
			"subscriptshift",
			"supscriptshift",
			"symmetric",
			"voffset",
			"width",
			"xmlns"
		]);
		const xml = freeze([
			"xlink:href",
			"xml:id",
			"xlink:title",
			"xml:space",
			"xmlns:xlink"
		]);
		const MUSTACHE_EXPR = seal(/\{\{[\w\W]*|[\w\W]*\}\}/gm);
		const ERB_EXPR = seal(/<%[\w\W]*|[\w\W]*%>/gm);
		const TMPLIT_EXPR = seal(/\$\{[\w\W]*/gm);
		const DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/);
		const ARIA_ATTR = seal(/^aria-[\-\w]+$/);
		const IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i);
		const IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
		const ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g);
		const DOCTYPE_NAME = seal(/^html$/i);
		const CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);
		var EXPRESSIONS = /*#__PURE__*/ Object.freeze({
			__proto__: null,
			ARIA_ATTR,
			ATTR_WHITESPACE,
			CUSTOM_ELEMENT,
			DATA_ATTR,
			DOCTYPE_NAME,
			ERB_EXPR,
			IS_ALLOWED_URI,
			IS_SCRIPT_OR_DATA,
			MUSTACHE_EXPR,
			TMPLIT_EXPR
		});
		const NODE_TYPE = {
			element: 1,
			attribute: 2,
			text: 3,
			cdataSection: 4,
			entityReference: 5,
			entityNode: 6,
			progressingInstruction: 7,
			comment: 8,
			document: 9,
			documentType: 10,
			documentFragment: 11,
			notation: 12
		};
		const getGlobal = function getGlobal() {
			return typeof window === "undefined" ? null : window;
		};
		/**
		* Creates a no-op policy for internal use only.
		* Don't export this function outside this module!
		* @param trustedTypes The policy factory.
		* @param purifyHostElement The Script element used to load DOMPurify (to determine policy name suffix).
		* @return The policy created (or null, if Trusted Types
		* are not supported or creating the policy failed).
		*/
		const _createTrustedTypesPolicy = function _createTrustedTypesPolicy(trustedTypes, purifyHostElement) {
			if (typeof trustedTypes !== "object" || typeof trustedTypes.createPolicy !== "function") return null;
			let suffix = null;
			const ATTR_NAME = "data-tt-policy-suffix";
			if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) suffix = purifyHostElement.getAttribute(ATTR_NAME);
			const policyName = "dompurify" + (suffix ? "#" + suffix : "");
			try {
				return trustedTypes.createPolicy(policyName, {
					createHTML(html) {
						return html;
					},
					createScriptURL(scriptUrl) {
						return scriptUrl;
					}
				});
			} catch (_) {
				console.warn("TrustedTypes policy " + policyName + " could not be created.");
				return null;
			}
		};
		const _createHooksMap = function _createHooksMap() {
			return {
				afterSanitizeAttributes: [],
				afterSanitizeElements: [],
				afterSanitizeShadowDOM: [],
				beforeSanitizeAttributes: [],
				beforeSanitizeElements: [],
				beforeSanitizeShadowDOM: [],
				uponSanitizeAttribute: [],
				uponSanitizeElement: [],
				uponSanitizeShadowNode: []
			};
		};
		function createDOMPurify() {
			let window = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : getGlobal();
			const DOMPurify = (root) => createDOMPurify(root);
			DOMPurify.version = "3.3.0";
			DOMPurify.removed = [];
			if (!window || !window.document || window.document.nodeType !== NODE_TYPE.document || !window.Element) {
				DOMPurify.isSupported = false;
				return DOMPurify;
			}
			let { document } = window;
			const originalDocument = document;
			const currentScript = originalDocument.currentScript;
			const { DocumentFragment, HTMLTemplateElement, Node, Element, NodeFilter, NamedNodeMap = window.NamedNodeMap || window.MozNamedAttrMap, HTMLFormElement, DOMParser, trustedTypes } = window;
			const ElementPrototype = Element.prototype;
			const cloneNode = lookupGetter(ElementPrototype, "cloneNode");
			const remove = lookupGetter(ElementPrototype, "remove");
			const getNextSibling = lookupGetter(ElementPrototype, "nextSibling");
			const getChildNodes = lookupGetter(ElementPrototype, "childNodes");
			const getParentNode = lookupGetter(ElementPrototype, "parentNode");
			if (typeof HTMLTemplateElement === "function") {
				const template = document.createElement("template");
				if (template.content && template.content.ownerDocument) document = template.content.ownerDocument;
			}
			let trustedTypesPolicy;
			let emptyHTML = "";
			const { implementation, createNodeIterator, createDocumentFragment, getElementsByTagName } = document;
			const { importNode } = originalDocument;
			let hooks = _createHooksMap();
			/**
			* Expose whether this browser supports running the full DOMPurify.
			*/
			DOMPurify.isSupported = typeof entries$1 === "function" && typeof getParentNode === "function" && implementation && implementation.createHTMLDocument !== void 0;
			const { MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR, DATA_ATTR, ARIA_ATTR, IS_SCRIPT_OR_DATA, ATTR_WHITESPACE, CUSTOM_ELEMENT } = EXPRESSIONS;
			let { IS_ALLOWED_URI: IS_ALLOWED_URI$1 } = EXPRESSIONS;
			/**
			* We consider the elements and attributes below to be safe. Ideally
			* don't add any new ones but feel free to remove unwanted ones.
			*/
			let ALLOWED_TAGS = null;
			const DEFAULT_ALLOWED_TAGS = addToSet({}, [
				...html$1,
				...svg$1,
				...svgFilters,
				...mathMl$1,
				...text$1
			]);
			let ALLOWED_ATTR = null;
			const DEFAULT_ALLOWED_ATTR = addToSet({}, [
				...html,
				...svg,
				...mathMl,
				...xml
			]);
			let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
				tagNameCheck: {
					writable: true,
					configurable: false,
					enumerable: true,
					value: null
				},
				attributeNameCheck: {
					writable: true,
					configurable: false,
					enumerable: true,
					value: null
				},
				allowCustomizedBuiltInElements: {
					writable: true,
					configurable: false,
					enumerable: true,
					value: false
				}
			}));
			let FORBID_TAGS = null;
			let FORBID_ATTR = null;
			const EXTRA_ELEMENT_HANDLING = Object.seal(create(null, {
				tagCheck: {
					writable: true,
					configurable: false,
					enumerable: true,
					value: null
				},
				attributeCheck: {
					writable: true,
					configurable: false,
					enumerable: true,
					value: null
				}
			}));
			let ALLOW_ARIA_ATTR = true;
			let ALLOW_DATA_ATTR = true;
			let ALLOW_UNKNOWN_PROTOCOLS = false;
			let ALLOW_SELF_CLOSE_IN_ATTR = true;
			let SAFE_FOR_TEMPLATES = false;
			let SAFE_FOR_XML = true;
			let WHOLE_DOCUMENT = false;
			let SET_CONFIG = false;
			let FORCE_BODY = false;
			let RETURN_DOM = false;
			let RETURN_DOM_FRAGMENT = false;
			let RETURN_TRUSTED_TYPE = false;
			let SANITIZE_DOM = true;
			let SANITIZE_NAMED_PROPS = false;
			const SANITIZE_NAMED_PROPS_PREFIX = "user-content-";
			let KEEP_CONTENT = true;
			let IN_PLACE = false;
			let USE_PROFILES = {};
			let FORBID_CONTENTS = null;
			const DEFAULT_FORBID_CONTENTS = addToSet({}, [
				"annotation-xml",
				"audio",
				"colgroup",
				"desc",
				"foreignobject",
				"head",
				"iframe",
				"math",
				"mi",
				"mn",
				"mo",
				"ms",
				"mtext",
				"noembed",
				"noframes",
				"noscript",
				"plaintext",
				"script",
				"style",
				"svg",
				"template",
				"thead",
				"title",
				"video",
				"xmp"
			]);
			let DATA_URI_TAGS = null;
			const DEFAULT_DATA_URI_TAGS = addToSet({}, [
				"audio",
				"video",
				"img",
				"source",
				"image",
				"track"
			]);
			let URI_SAFE_ATTRIBUTES = null;
			const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, [
				"alt",
				"class",
				"for",
				"id",
				"label",
				"name",
				"pattern",
				"placeholder",
				"role",
				"summary",
				"title",
				"value",
				"style",
				"xmlns"
			]);
			const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
			const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
			const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
			let NAMESPACE = HTML_NAMESPACE;
			let IS_EMPTY_INPUT = false;
			let ALLOWED_NAMESPACES = null;
			const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [
				MATHML_NAMESPACE,
				SVG_NAMESPACE,
				HTML_NAMESPACE
			], stringToString);
			let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, [
				"mi",
				"mo",
				"mn",
				"ms",
				"mtext"
			]);
			let HTML_INTEGRATION_POINTS = addToSet({}, ["annotation-xml"]);
			const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, [
				"title",
				"style",
				"font",
				"a",
				"script"
			]);
			let PARSER_MEDIA_TYPE = null;
			const SUPPORTED_PARSER_MEDIA_TYPES = ["application/xhtml+xml", "text/html"];
			const DEFAULT_PARSER_MEDIA_TYPE = "text/html";
			let transformCaseFunc = null;
			let CONFIG = null;
			const formElement = document.createElement("form");
			const isRegexOrFunction = function isRegexOrFunction(testValue) {
				return testValue instanceof RegExp || testValue instanceof Function;
			};
			/**
			* _parseConfig
			*
			* @param cfg optional config literal
			*/
			const _parseConfig = function _parseConfig() {
				let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
				if (CONFIG && CONFIG === cfg) return;
				if (!cfg || typeof cfg !== "object") cfg = {};
				cfg = clone$1(cfg);
				PARSER_MEDIA_TYPE = SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
				transformCaseFunc = PARSER_MEDIA_TYPE === "application/xhtml+xml" ? stringToString : stringToLowerCase;
				ALLOWED_TAGS = objectHasOwnProperty(cfg, "ALLOWED_TAGS") ? addToSet({}, cfg.ALLOWED_TAGS, transformCaseFunc) : DEFAULT_ALLOWED_TAGS;
				ALLOWED_ATTR = objectHasOwnProperty(cfg, "ALLOWED_ATTR") ? addToSet({}, cfg.ALLOWED_ATTR, transformCaseFunc) : DEFAULT_ALLOWED_ATTR;
				ALLOWED_NAMESPACES = objectHasOwnProperty(cfg, "ALLOWED_NAMESPACES") ? addToSet({}, cfg.ALLOWED_NAMESPACES, stringToString) : DEFAULT_ALLOWED_NAMESPACES;
				URI_SAFE_ATTRIBUTES = objectHasOwnProperty(cfg, "ADD_URI_SAFE_ATTR") ? addToSet(clone$1(DEFAULT_URI_SAFE_ATTRIBUTES), cfg.ADD_URI_SAFE_ATTR, transformCaseFunc) : DEFAULT_URI_SAFE_ATTRIBUTES;
				DATA_URI_TAGS = objectHasOwnProperty(cfg, "ADD_DATA_URI_TAGS") ? addToSet(clone$1(DEFAULT_DATA_URI_TAGS), cfg.ADD_DATA_URI_TAGS, transformCaseFunc) : DEFAULT_DATA_URI_TAGS;
				FORBID_CONTENTS = objectHasOwnProperty(cfg, "FORBID_CONTENTS") ? addToSet({}, cfg.FORBID_CONTENTS, transformCaseFunc) : DEFAULT_FORBID_CONTENTS;
				FORBID_TAGS = objectHasOwnProperty(cfg, "FORBID_TAGS") ? addToSet({}, cfg.FORBID_TAGS, transformCaseFunc) : clone$1({});
				FORBID_ATTR = objectHasOwnProperty(cfg, "FORBID_ATTR") ? addToSet({}, cfg.FORBID_ATTR, transformCaseFunc) : clone$1({});
				USE_PROFILES = objectHasOwnProperty(cfg, "USE_PROFILES") ? cfg.USE_PROFILES : false;
				ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false;
				ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false;
				ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false;
				ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false;
				SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false;
				SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false;
				WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false;
				RETURN_DOM = cfg.RETURN_DOM || false;
				RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false;
				RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false;
				FORCE_BODY = cfg.FORCE_BODY || false;
				SANITIZE_DOM = cfg.SANITIZE_DOM !== false;
				SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false;
				KEEP_CONTENT = cfg.KEEP_CONTENT !== false;
				IN_PLACE = cfg.IN_PLACE || false;
				IS_ALLOWED_URI$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI;
				NAMESPACE = cfg.NAMESPACE || HTML_NAMESPACE;
				MATHML_TEXT_INTEGRATION_POINTS = cfg.MATHML_TEXT_INTEGRATION_POINTS || MATHML_TEXT_INTEGRATION_POINTS;
				HTML_INTEGRATION_POINTS = cfg.HTML_INTEGRATION_POINTS || HTML_INTEGRATION_POINTS;
				CUSTOM_ELEMENT_HANDLING = cfg.CUSTOM_ELEMENT_HANDLING || {};
				if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck)) CUSTOM_ELEMENT_HANDLING.tagNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck;
				if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)) CUSTOM_ELEMENT_HANDLING.attributeNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck;
				if (cfg.CUSTOM_ELEMENT_HANDLING && typeof cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements === "boolean") CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements;
				if (SAFE_FOR_TEMPLATES) ALLOW_DATA_ATTR = false;
				if (RETURN_DOM_FRAGMENT) RETURN_DOM = true;
				if (USE_PROFILES) {
					ALLOWED_TAGS = addToSet({}, text$1);
					ALLOWED_ATTR = [];
					if (USE_PROFILES.html === true) {
						addToSet(ALLOWED_TAGS, html$1);
						addToSet(ALLOWED_ATTR, html);
					}
					if (USE_PROFILES.svg === true) {
						addToSet(ALLOWED_TAGS, svg$1);
						addToSet(ALLOWED_ATTR, svg);
						addToSet(ALLOWED_ATTR, xml);
					}
					if (USE_PROFILES.svgFilters === true) {
						addToSet(ALLOWED_TAGS, svgFilters);
						addToSet(ALLOWED_ATTR, svg);
						addToSet(ALLOWED_ATTR, xml);
					}
					if (USE_PROFILES.mathMl === true) {
						addToSet(ALLOWED_TAGS, mathMl$1);
						addToSet(ALLOWED_ATTR, mathMl);
						addToSet(ALLOWED_ATTR, xml);
					}
				}
				if (cfg.ADD_TAGS) if (typeof cfg.ADD_TAGS === "function") EXTRA_ELEMENT_HANDLING.tagCheck = cfg.ADD_TAGS;
				else {
					if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) ALLOWED_TAGS = clone$1(ALLOWED_TAGS);
					addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
				}
				if (cfg.ADD_ATTR) if (typeof cfg.ADD_ATTR === "function") EXTRA_ELEMENT_HANDLING.attributeCheck = cfg.ADD_ATTR;
				else {
					if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) ALLOWED_ATTR = clone$1(ALLOWED_ATTR);
					addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
				}
				if (cfg.ADD_URI_SAFE_ATTR) addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR, transformCaseFunc);
				if (cfg.FORBID_CONTENTS) {
					if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) FORBID_CONTENTS = clone$1(FORBID_CONTENTS);
					addToSet(FORBID_CONTENTS, cfg.FORBID_CONTENTS, transformCaseFunc);
				}
				if (KEEP_CONTENT) ALLOWED_TAGS["#text"] = true;
				if (WHOLE_DOCUMENT) addToSet(ALLOWED_TAGS, [
					"html",
					"head",
					"body"
				]);
				if (ALLOWED_TAGS.table) {
					addToSet(ALLOWED_TAGS, ["tbody"]);
					delete FORBID_TAGS.tbody;
				}
				if (cfg.TRUSTED_TYPES_POLICY) {
					if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== "function") throw typeErrorCreate("TRUSTED_TYPES_POLICY configuration option must provide a \"createHTML\" hook.");
					if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== "function") throw typeErrorCreate("TRUSTED_TYPES_POLICY configuration option must provide a \"createScriptURL\" hook.");
					trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
					emptyHTML = trustedTypesPolicy.createHTML("");
				} else {
					if (trustedTypesPolicy === void 0) trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
					if (trustedTypesPolicy !== null && typeof emptyHTML === "string") emptyHTML = trustedTypesPolicy.createHTML("");
				}
				if (freeze) freeze(cfg);
				CONFIG = cfg;
			};
			const ALL_SVG_TAGS = addToSet({}, [
				...svg$1,
				...svgFilters,
				...svgDisallowed
			]);
			const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
			/**
			* @param element a DOM element whose namespace is being checked
			* @returns Return false if the element has a
			*  namespace that a spec-compliant parser would never
			*  return. Return true otherwise.
			*/
			const _checkValidNamespace = function _checkValidNamespace(element) {
				let parent = getParentNode(element);
				if (!parent || !parent.tagName) parent = {
					namespaceURI: NAMESPACE,
					tagName: "template"
				};
				const tagName = stringToLowerCase(element.tagName);
				const parentTagName = stringToLowerCase(parent.tagName);
				if (!ALLOWED_NAMESPACES[element.namespaceURI]) return false;
				if (element.namespaceURI === SVG_NAMESPACE) {
					if (parent.namespaceURI === HTML_NAMESPACE) return tagName === "svg";
					if (parent.namespaceURI === MATHML_NAMESPACE) return tagName === "svg" && (parentTagName === "annotation-xml" || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
					return Boolean(ALL_SVG_TAGS[tagName]);
				}
				if (element.namespaceURI === MATHML_NAMESPACE) {
					if (parent.namespaceURI === HTML_NAMESPACE) return tagName === "math";
					if (parent.namespaceURI === SVG_NAMESPACE) return tagName === "math" && HTML_INTEGRATION_POINTS[parentTagName];
					return Boolean(ALL_MATHML_TAGS[tagName]);
				}
				if (element.namespaceURI === HTML_NAMESPACE) {
					if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) return false;
					if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) return false;
					return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
				}
				if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && ALLOWED_NAMESPACES[element.namespaceURI]) return true;
				return false;
			};
			/**
			* _forceRemove
			*
			* @param node a DOM node
			*/
			const _forceRemove = function _forceRemove(node) {
				arrayPush(DOMPurify.removed, { element: node });
				try {
					getParentNode(node).removeChild(node);
				} catch (_) {
					remove(node);
				}
			};
			/**
			* _removeAttribute
			*
			* @param name an Attribute name
			* @param element a DOM node
			*/
			const _removeAttribute = function _removeAttribute(name, element) {
				try {
					arrayPush(DOMPurify.removed, {
						attribute: element.getAttributeNode(name),
						from: element
					});
				} catch (_) {
					arrayPush(DOMPurify.removed, {
						attribute: null,
						from: element
					});
				}
				element.removeAttribute(name);
				if (name === "is") if (RETURN_DOM || RETURN_DOM_FRAGMENT) try {
					_forceRemove(element);
				} catch (_) {}
				else try {
					element.setAttribute(name, "");
				} catch (_) {}
			};
			/**
			* _initDocument
			*
			* @param dirty - a string of dirty markup
			* @return a DOM, filled with the dirty markup
			*/
			const _initDocument = function _initDocument(dirty) {
				let doc = null;
				let leadingWhitespace = null;
				if (FORCE_BODY) dirty = "<remove></remove>" + dirty;
				else {
					const matches = stringMatch(dirty, /^[\r\n\t ]+/);
					leadingWhitespace = matches && matches[0];
				}
				if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && NAMESPACE === HTML_NAMESPACE) dirty = "<html xmlns=\"http://www.w3.org/1999/xhtml\"><head></head><body>" + dirty + "</body></html>";
				const dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
				if (NAMESPACE === HTML_NAMESPACE) try {
					doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
				} catch (_) {}
				if (!doc || !doc.documentElement) {
					doc = implementation.createDocument(NAMESPACE, "template", null);
					try {
						doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
					} catch (_) {}
				}
				const body = doc.body || doc.documentElement;
				if (dirty && leadingWhitespace) body.insertBefore(document.createTextNode(leadingWhitespace), body.childNodes[0] || null);
				if (NAMESPACE === HTML_NAMESPACE) return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? "html" : "body")[0];
				return WHOLE_DOCUMENT ? doc.documentElement : body;
			};
			/**
			* Creates a NodeIterator object that you can use to traverse filtered lists of nodes or elements in a document.
			*
			* @param root The root element or node to start traversing on.
			* @return The created NodeIterator
			*/
			const _createNodeIterator = function _createNodeIterator(root) {
				return createNodeIterator.call(root.ownerDocument || root, root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION, null);
			};
			/**
			* _isClobbered
			*
			* @param element element to check for clobbering attacks
			* @return true if clobbered, false if safe
			*/
			const _isClobbered = function _isClobbered(element) {
				return element instanceof HTMLFormElement && (typeof element.nodeName !== "string" || typeof element.textContent !== "string" || typeof element.removeChild !== "function" || !(element.attributes instanceof NamedNodeMap) || typeof element.removeAttribute !== "function" || typeof element.setAttribute !== "function" || typeof element.namespaceURI !== "string" || typeof element.insertBefore !== "function" || typeof element.hasChildNodes !== "function");
			};
			/**
			* Checks whether the given object is a DOM node.
			*
			* @param value object to check whether it's a DOM node
			* @return true is object is a DOM node
			*/
			const _isNode = function _isNode(value) {
				return typeof Node === "function" && value instanceof Node;
			};
			function _executeHooks(hooks, currentNode, data) {
				arrayForEach(hooks, (hook) => {
					hook.call(DOMPurify, currentNode, data, CONFIG);
				});
			}
			/**
			* _sanitizeElements
			*
			* @protect nodeName
			* @protect textContent
			* @protect removeChild
			* @param currentNode to check for permission to exist
			* @return true if node was killed, false if left alive
			*/
			const _sanitizeElements = function _sanitizeElements(currentNode) {
				let content = null;
				_executeHooks(hooks.beforeSanitizeElements, currentNode, null);
				if (_isClobbered(currentNode)) {
					_forceRemove(currentNode);
					return true;
				}
				const tagName = transformCaseFunc(currentNode.nodeName);
				_executeHooks(hooks.uponSanitizeElement, currentNode, {
					tagName,
					allowedTags: ALLOWED_TAGS
				});
				if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(/<[/\w!]/g, currentNode.innerHTML) && regExpTest(/<[/\w!]/g, currentNode.textContent)) {
					_forceRemove(currentNode);
					return true;
				}
				if (currentNode.nodeType === NODE_TYPE.progressingInstruction) {
					_forceRemove(currentNode);
					return true;
				}
				if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(/<[/\w]/g, currentNode.data)) {
					_forceRemove(currentNode);
					return true;
				}
				if (!(EXTRA_ELEMENT_HANDLING.tagCheck instanceof Function && EXTRA_ELEMENT_HANDLING.tagCheck(tagName)) && (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName])) {
					if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName)) {
						if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) return false;
						if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(tagName)) return false;
					}
					if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
						const parentNode = getParentNode(currentNode) || currentNode.parentNode;
						const childNodes = getChildNodes(currentNode) || currentNode.childNodes;
						if (childNodes && parentNode) {
							const childCount = childNodes.length;
							for (let i = childCount - 1; i >= 0; --i) {
								const childClone = cloneNode(childNodes[i], true);
								childClone.__removalCount = (currentNode.__removalCount || 0) + 1;
								parentNode.insertBefore(childClone, getNextSibling(currentNode));
							}
						}
					}
					_forceRemove(currentNode);
					return true;
				}
				if (currentNode instanceof Element && !_checkValidNamespace(currentNode)) {
					_forceRemove(currentNode);
					return true;
				}
				if ((tagName === "noscript" || tagName === "noembed" || tagName === "noframes") && regExpTest(/<\/no(script|embed|frames)/i, currentNode.innerHTML)) {
					_forceRemove(currentNode);
					return true;
				}
				if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
					content = currentNode.textContent;
					arrayForEach([
						MUSTACHE_EXPR,
						ERB_EXPR,
						TMPLIT_EXPR
					], (expr) => {
						content = stringReplace(content, expr, " ");
					});
					if (currentNode.textContent !== content) {
						arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
						currentNode.textContent = content;
					}
				}
				_executeHooks(hooks.afterSanitizeElements, currentNode, null);
				return false;
			};
			/**
			* _isValidAttribute
			*
			* @param lcTag Lowercase tag name of containing element.
			* @param lcName Lowercase attribute name.
			* @param value Attribute value.
			* @return Returns true if `value` is valid, otherwise false.
			*/
			const _isValidAttribute = function _isValidAttribute(lcTag, lcName, value) {
				if (SANITIZE_DOM && (lcName === "id" || lcName === "name") && (value in document || value in formElement)) return false;
				if (ALLOW_DATA_ATTR && !FORBID_ATTR[lcName] && regExpTest(DATA_ATTR, lcName));
				else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR, lcName));
				else if (EXTRA_ELEMENT_HANDLING.attributeCheck instanceof Function && EXTRA_ELEMENT_HANDLING.attributeCheck(lcName, lcTag));
				else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) if (_isBasicCustomElement(lcTag) && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(lcTag)) && (CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName) || CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.attributeNameCheck(lcName, lcTag)) || lcName === "is" && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(value)));
				else return false;
				else if (URI_SAFE_ATTRIBUTES[lcName]);
				else if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE, "")));
				else if ((lcName === "src" || lcName === "xlink:href" || lcName === "href") && lcTag !== "script" && stringIndexOf(value, "data:") === 0 && DATA_URI_TAGS[lcTag]);
				else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA, stringReplace(value, ATTR_WHITESPACE, "")));
				else if (value) return false;
				return true;
			};
			/**
			* _isBasicCustomElement
			* checks if at least one dash is included in tagName, and it's not the first char
			* for more sophisticated checking see https://github.com/sindresorhus/validate-element-name
			*
			* @param tagName name of the tag of the node to sanitize
			* @returns Returns true if the tag name meets the basic criteria for a custom element, otherwise false.
			*/
			const _isBasicCustomElement = function _isBasicCustomElement(tagName) {
				return tagName !== "annotation-xml" && stringMatch(tagName, CUSTOM_ELEMENT);
			};
			/**
			* _sanitizeAttributes
			*
			* @protect attributes
			* @protect nodeName
			* @protect removeAttribute
			* @protect setAttribute
			*
			* @param currentNode to sanitize
			*/
			const _sanitizeAttributes = function _sanitizeAttributes(currentNode) {
				_executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
				const { attributes } = currentNode;
				if (!attributes || _isClobbered(currentNode)) return;
				const hookEvent = {
					attrName: "",
					attrValue: "",
					keepAttr: true,
					allowedAttributes: ALLOWED_ATTR,
					forceKeepAttr: void 0
				};
				let l = attributes.length;
				while (l--) {
					const { name, namespaceURI, value: attrValue } = attributes[l];
					const lcName = transformCaseFunc(name);
					const initValue = attrValue;
					let value = name === "value" ? initValue : stringTrim(initValue);
					hookEvent.attrName = lcName;
					hookEvent.attrValue = value;
					hookEvent.keepAttr = true;
					hookEvent.forceKeepAttr = void 0;
					_executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
					value = hookEvent.attrValue;
					if (SANITIZE_NAMED_PROPS && (lcName === "id" || lcName === "name")) {
						_removeAttribute(name, currentNode);
						value = SANITIZE_NAMED_PROPS_PREFIX + value;
					}
					if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|title|textarea)/i, value)) {
						_removeAttribute(name, currentNode);
						continue;
					}
					if (lcName === "attributename" && stringMatch(value, "href")) {
						_removeAttribute(name, currentNode);
						continue;
					}
					if (hookEvent.forceKeepAttr) continue;
					if (!hookEvent.keepAttr) {
						_removeAttribute(name, currentNode);
						continue;
					}
					if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(/\/>/i, value)) {
						_removeAttribute(name, currentNode);
						continue;
					}
					if (SAFE_FOR_TEMPLATES) arrayForEach([
						MUSTACHE_EXPR,
						ERB_EXPR,
						TMPLIT_EXPR
					], (expr) => {
						value = stringReplace(value, expr, " ");
					});
					const lcTag = transformCaseFunc(currentNode.nodeName);
					if (!_isValidAttribute(lcTag, lcName, value)) {
						_removeAttribute(name, currentNode);
						continue;
					}
					if (trustedTypesPolicy && typeof trustedTypes === "object" && typeof trustedTypes.getAttributeType === "function") if (namespaceURI);
					else switch (trustedTypes.getAttributeType(lcTag, lcName)) {
						case "TrustedHTML":
							value = trustedTypesPolicy.createHTML(value);
							break;
						case "TrustedScriptURL":
							value = trustedTypesPolicy.createScriptURL(value);
							break;
					}
					if (value !== initValue) try {
						if (namespaceURI) currentNode.setAttributeNS(namespaceURI, name, value);
						else currentNode.setAttribute(name, value);
						if (_isClobbered(currentNode)) _forceRemove(currentNode);
						else arrayPop(DOMPurify.removed);
					} catch (_) {
						_removeAttribute(name, currentNode);
					}
				}
				_executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
			};
			/**
			* _sanitizeShadowDOM
			*
			* @param fragment to iterate over recursively
			*/
			const _sanitizeShadowDOM = function _sanitizeShadowDOM(fragment) {
				let shadowNode = null;
				const shadowIterator = _createNodeIterator(fragment);
				_executeHooks(hooks.beforeSanitizeShadowDOM, fragment, null);
				while (shadowNode = shadowIterator.nextNode()) {
					_executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
					_sanitizeElements(shadowNode);
					_sanitizeAttributes(shadowNode);
					if (shadowNode.content instanceof DocumentFragment) _sanitizeShadowDOM(shadowNode.content);
				}
				_executeHooks(hooks.afterSanitizeShadowDOM, fragment, null);
			};
			DOMPurify.sanitize = function(dirty) {
				let cfg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
				let body = null;
				let importedNode = null;
				let currentNode = null;
				let returnNode = null;
				IS_EMPTY_INPUT = !dirty;
				if (IS_EMPTY_INPUT) dirty = "<!-->";
				if (typeof dirty !== "string" && !_isNode(dirty)) if (typeof dirty.toString === "function") {
					dirty = dirty.toString();
					if (typeof dirty !== "string") throw typeErrorCreate("dirty is not a string, aborting");
				} else throw typeErrorCreate("toString is not a function");
				if (!DOMPurify.isSupported) return dirty;
				if (!SET_CONFIG) _parseConfig(cfg);
				DOMPurify.removed = [];
				if (typeof dirty === "string") IN_PLACE = false;
				if (IN_PLACE) {
					if (dirty.nodeName) {
						const tagName = transformCaseFunc(dirty.nodeName);
						if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) throw typeErrorCreate("root node is forbidden and cannot be sanitized in-place");
					}
				} else if (dirty instanceof Node) {
					body = _initDocument("<!---->");
					importedNode = body.ownerDocument.importNode(dirty, true);
					if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === "BODY") body = importedNode;
					else if (importedNode.nodeName === "HTML") body = importedNode;
					else body.appendChild(importedNode);
				} else {
					if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && dirty.indexOf("<") === -1) return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(dirty) : dirty;
					body = _initDocument(dirty);
					if (!body) return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : "";
				}
				if (body && FORCE_BODY) _forceRemove(body.firstChild);
				const nodeIterator = _createNodeIterator(IN_PLACE ? dirty : body);
				while (currentNode = nodeIterator.nextNode()) {
					_sanitizeElements(currentNode);
					_sanitizeAttributes(currentNode);
					if (currentNode.content instanceof DocumentFragment) _sanitizeShadowDOM(currentNode.content);
				}
				if (IN_PLACE) return dirty;
				if (RETURN_DOM) {
					if (RETURN_DOM_FRAGMENT) {
						returnNode = createDocumentFragment.call(body.ownerDocument);
						while (body.firstChild) returnNode.appendChild(body.firstChild);
					} else returnNode = body;
					if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) returnNode = importNode.call(originalDocument, returnNode, true);
					return returnNode;
				}
				let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
				if (WHOLE_DOCUMENT && ALLOWED_TAGS["!doctype"] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) serializedHTML = "<!DOCTYPE " + body.ownerDocument.doctype.name + ">\n" + serializedHTML;
				if (SAFE_FOR_TEMPLATES) arrayForEach([
					MUSTACHE_EXPR,
					ERB_EXPR,
					TMPLIT_EXPR
				], (expr) => {
					serializedHTML = stringReplace(serializedHTML, expr, " ");
				});
				return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
			};
			DOMPurify.setConfig = function() {
				let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
				_parseConfig(cfg);
				SET_CONFIG = true;
			};
			DOMPurify.clearConfig = function() {
				CONFIG = null;
				SET_CONFIG = false;
			};
			DOMPurify.isValidAttribute = function(tag, attr, value) {
				if (!CONFIG) _parseConfig({});
				const lcTag = transformCaseFunc(tag);
				const lcName = transformCaseFunc(attr);
				return _isValidAttribute(lcTag, lcName, value);
			};
			DOMPurify.addHook = function(entryPoint, hookFunction) {
				if (typeof hookFunction !== "function") return;
				arrayPush(hooks[entryPoint], hookFunction);
			};
			DOMPurify.removeHook = function(entryPoint, hookFunction) {
				if (hookFunction !== void 0) {
					const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
					return index === -1 ? void 0 : arraySplice(hooks[entryPoint], index, 1)[0];
				}
				return arrayPop(hooks[entryPoint]);
			};
			DOMPurify.removeHooks = function(entryPoint) {
				hooks[entryPoint] = [];
			};
			DOMPurify.removeAllHooks = function() {
				hooks = _createHooksMap();
			};
			return DOMPurify;
		}
		var purify = createDOMPurify();
		//#endregion
		//#region node_modules/.pnpm/marked@16.4.2/node_modules/marked/lib/marked.esm.js
		/**
		* marked v16.4.2 - a markdown parser
		* Copyright (c) 2018-2025, MarkedJS. (MIT License)
		* Copyright (c) 2011-2018, Christopher Jeffrey. (MIT License)
		* https://github.com/markedjs/marked
		*/
		/**
		* DO NOT EDIT THIS FILE
		* The code in this file is generated from files in ./src/
		*/
		function L() {
			return {
				async: !1,
				breaks: !1,
				extensions: null,
				gfm: !0,
				hooks: null,
				pedantic: !1,
				renderer: null,
				silent: !1,
				tokenizer: null,
				walkTokens: null
			};
		}
		var T = L();
		function G(l) {
			T = l;
		}
		var E = { exec: () => null };
		function d(l, e = "") {
			let t = typeof l == "string" ? l : l.source, n = {
				replace: (r, i) => {
					let s = typeof i == "string" ? i : i.source;
					return s = s.replace(m.caret, "$1"), t = t.replace(r, s), n;
				},
				getRegex: () => new RegExp(t, e)
			};
			return n;
		}
		var be = (() => {
			try {
				return true;
			} catch {
				return !1;
			}
		})();
		var m = {
			codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
			outputLinkReplace: /\\([\[\]])/g,
			indentCodeCompensation: /^(\s+)(?:```)/,
			beginningSpace: /^\s+/,
			endingHash: /#$/,
			startingSpaceChar: /^ /,
			endingSpaceChar: / $/,
			nonSpaceChar: /[^ ]/,
			newLineCharGlobal: /\n/g,
			tabCharGlobal: /\t/g,
			multipleSpaceGlobal: /\s+/g,
			blankLine: /^[ \t]*$/,
			doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
			blockquoteStart: /^ {0,3}>/,
			blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
			blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
			listReplaceTabs: /^\t+/,
			listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
			listIsTask: /^\[[ xX]\] /,
			listReplaceTask: /^\[[ xX]\] +/,
			anyLine: /\n.*\n/,
			hrefBrackets: /^<(.*)>$/,
			tableDelimiter: /[:|]/,
			tableAlignChars: /^\||\| *$/g,
			tableRowBlankLine: /\n[ \t]*$/,
			tableAlignRight: /^ *-+: *$/,
			tableAlignCenter: /^ *:-+: *$/,
			tableAlignLeft: /^ *:-+ *$/,
			startATag: /^<a /i,
			endATag: /^<\/a>/i,
			startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
			endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
			startAngleBracket: /^</,
			endAngleBracket: />$/,
			pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
			unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
			escapeTest: /[&<>"']/,
			escapeReplace: /[&<>"']/g,
			escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
			escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
			unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/gi,
			caret: /(^|[^\[])\^/g,
			percentDecode: /%25/g,
			findPipe: /\|/g,
			splitPipe: / \|/,
			slashPipe: /\\\|/g,
			carriageReturn: /\r\n|\r/g,
			spaceLine: /^ +$/gm,
			notSpaceStart: /^\S*/,
			endingNewline: /\n$/,
			listItemRegex: (l) => new RegExp(`^( {0,3}${l})((?:[	 ][^\\n]*)?(?:\\n|$))`),
			nextBulletRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
			hrRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
			fencesBeginRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}(?:\`\`\`|~~~)`),
			headingBeginRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}#`),
			htmlBeginRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}<(?:[a-z].*>|!--)`, "i")
		};
		var Re = /^(?:[ \t]*(?:\n|$))+/;
		var Te = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
		var Oe = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
		var I = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
		var we = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
		var F = /(?:[*+-]|\d{1,9}[.)])/;
		var ie = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
		var oe = d(ie).replace(/bull/g, F).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
		var ye = d(ie).replace(/bull/g, F).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
		var j = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
		var Pe = /^[^\n]+/;
		var Q = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
		var Se = d(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", Q).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
		var $e = d(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, F).getRegex();
		var v = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
		var U = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
		var _e = d("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", U).replace("tag", v).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
		var ae = d(j).replace("hr", I).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex();
		var K = {
			blockquote: d(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", ae).getRegex(),
			code: Te,
			def: Se,
			fences: Oe,
			heading: we,
			hr: I,
			html: _e,
			lheading: oe,
			list: $e,
			newline: Re,
			paragraph: ae,
			table: E,
			text: Pe
		};
		var re = d("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", I).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex();
		var Me = {
			...K,
			lheading: ye,
			table: re,
			paragraph: d(j).replace("hr", I).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", re).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex()
		};
		var ze = {
			...K,
			html: d(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", U).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
			def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
			heading: /^(#{1,6})(.*)(?:\n+|$)/,
			fences: E,
			lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
			paragraph: d(j).replace("hr", I).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", oe).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex()
		};
		var Ae = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
		var Ee = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
		var le = /^( {2,}|\\)\n(?!\s*$)/;
		var Ie = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
		var D = /[\p{P}\p{S}]/u;
		var W = /[\s\p{P}\p{S}]/u;
		var ue = /[^\s\p{P}\p{S}]/u;
		var Ce = d(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, W).getRegex();
		var pe = /(?!~)[\p{P}\p{S}]/u;
		var Be = /(?!~)[\s\p{P}\p{S}]/u;
		var qe = /(?:[^\s\p{P}\p{S}]|~)/u;
		var ve = d(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", be ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
		var ce = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/;
		var De = d(ce, "u").replace(/punct/g, D).getRegex();
		var He = d(ce, "u").replace(/punct/g, pe).getRegex();
		var he = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
		var Ze = d(he, "gu").replace(/notPunctSpace/g, ue).replace(/punctSpace/g, W).replace(/punct/g, D).getRegex();
		var Ge = d(he, "gu").replace(/notPunctSpace/g, qe).replace(/punctSpace/g, Be).replace(/punct/g, pe).getRegex();
		var Ne = d("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, ue).replace(/punctSpace/g, W).replace(/punct/g, D).getRegex();
		var Fe = d(/\\(punct)/, "gu").replace(/punct/g, D).getRegex();
		var je = d(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
		var Qe = d(U).replace("(?:-->|$)", "-->").getRegex();
		var Ue = d("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", Qe).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
		var q = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/;
		var Ke = d(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", q).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
		var de = d(/^!?\[(label)\]\[(ref)\]/).replace("label", q).replace("ref", Q).getRegex();
		var ke = d(/^!?\[(ref)\](?:\[\])?/).replace("ref", Q).getRegex();
		var We = d("reflink|nolink(?!\\()", "g").replace("reflink", de).replace("nolink", ke).getRegex();
		var se = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
		var X = {
			_backpedal: E,
			anyPunctuation: Fe,
			autolink: je,
			blockSkip: ve,
			br: le,
			code: Ee,
			del: E,
			emStrongLDelim: De,
			emStrongRDelimAst: Ze,
			emStrongRDelimUnd: Ne,
			escape: Ae,
			link: Ke,
			nolink: ke,
			punctuation: Ce,
			reflink: de,
			reflinkSearch: We,
			tag: Ue,
			text: Ie,
			url: E
		};
		var Xe = {
			...X,
			link: d(/^!?\[(label)\]\((.*?)\)/).replace("label", q).getRegex(),
			reflink: d(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", q).getRegex()
		};
		var N = {
			...X,
			emStrongRDelimAst: Ge,
			emStrongLDelim: He,
			url: d(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", se).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),
			_backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
			del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,
			text: d(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", se).getRegex()
		};
		var Je = {
			...N,
			br: d(le).replace("{2,}", "*").getRegex(),
			text: d(N.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
		};
		var C = {
			normal: K,
			gfm: Me,
			pedantic: ze
		};
		var M = {
			normal: X,
			gfm: N,
			breaks: Je,
			pedantic: Xe
		};
		var Ve = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			"\"": "&quot;",
			"'": "&#39;"
		};
		var ge = (l) => Ve[l];
		function w(l, e) {
			if (e) {
				if (m.escapeTest.test(l)) return l.replace(m.escapeReplace, ge);
			} else if (m.escapeTestNoEncode.test(l)) return l.replace(m.escapeReplaceNoEncode, ge);
			return l;
		}
		function J(l) {
			try {
				l = encodeURI(l).replace(m.percentDecode, "%");
			} catch {
				return null;
			}
			return l;
		}
		function V(l, e) {
			let n = l.replace(m.findPipe, (i, s, a) => {
				let o = !1, p = s;
				for (; --p >= 0 && a[p] === "\\";) o = !o;
				return o ? "|" : " |";
			}).split(m.splitPipe), r = 0;
			if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e) if (n.length > e) n.splice(e);
			else for (; n.length < e;) n.push("");
			for (; r < n.length; r++) n[r] = n[r].trim().replace(m.slashPipe, "|");
			return n;
		}
		function z(l, e, t) {
			let n = l.length;
			if (n === 0) return "";
			let r = 0;
			for (; r < n;) {
				let i = l.charAt(n - r - 1);
				if (i === e && !t) r++;
				else if (i !== e && t) r++;
				else break;
			}
			return l.slice(0, n - r);
		}
		function fe(l, e) {
			if (l.indexOf(e[1]) === -1) return -1;
			let t = 0;
			for (let n = 0; n < l.length; n++) if (l[n] === "\\") n++;
			else if (l[n] === e[0]) t++;
			else if (l[n] === e[1] && (t--, t < 0)) return n;
			return t > 0 ? -2 : -1;
		}
		function me(l, e, t, n, r) {
			let i = e.href, s = e.title || null, a = l[1].replace(r.other.outputLinkReplace, "$1");
			n.state.inLink = !0;
			let o = {
				type: l[0].charAt(0) === "!" ? "image" : "link",
				raw: t,
				href: i,
				title: s,
				text: a,
				tokens: n.inlineTokens(a)
			};
			return n.state.inLink = !1, o;
		}
		function Ye(l, e, t) {
			let n = l.match(t.other.indentCodeCompensation);
			if (n === null) return e;
			let r = n[1];
			return e.split(`
`).map((i) => {
				let s = i.match(t.other.beginningSpace);
				if (s === null) return i;
				let [a] = s;
				return a.length >= r.length ? i.slice(r.length) : i;
			}).join(`
`);
		}
		var y = class {
			options;
			rules;
			lexer;
			constructor(e) {
				this.options = e || T;
			}
			space(e) {
				let t = this.rules.block.newline.exec(e);
				if (t && t[0].length > 0) return {
					type: "space",
					raw: t[0]
				};
			}
			code(e) {
				let t = this.rules.block.code.exec(e);
				if (t) {
					let n = t[0].replace(this.rules.other.codeRemoveIndent, "");
					return {
						type: "code",
						raw: t[0],
						codeBlockStyle: "indented",
						text: this.options.pedantic ? n : z(n, `
`)
					};
				}
			}
			fences(e) {
				let t = this.rules.block.fences.exec(e);
				if (t) {
					let n = t[0], r = Ye(n, t[3] || "", this.rules);
					return {
						type: "code",
						raw: n,
						lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2],
						text: r
					};
				}
			}
			heading(e) {
				let t = this.rules.block.heading.exec(e);
				if (t) {
					let n = t[2].trim();
					if (this.rules.other.endingHash.test(n)) {
						let r = z(n, "#");
						(this.options.pedantic || !r || this.rules.other.endingSpaceChar.test(r)) && (n = r.trim());
					}
					return {
						type: "heading",
						raw: t[0],
						depth: t[1].length,
						text: n,
						tokens: this.lexer.inline(n)
					};
				}
			}
			hr(e) {
				let t = this.rules.block.hr.exec(e);
				if (t) return {
					type: "hr",
					raw: z(t[0], `
`)
				};
			}
			blockquote(e) {
				let t = this.rules.block.blockquote.exec(e);
				if (t) {
					let n = z(t[0], `
`).split(`
`), r = "", i = "", s = [];
					for (; n.length > 0;) {
						let a = !1, o = [], p;
						for (p = 0; p < n.length; p++) if (this.rules.other.blockquoteStart.test(n[p])) o.push(n[p]), a = !0;
						else if (!a) o.push(n[p]);
						else break;
						n = n.slice(p);
						let u = o.join(`
`), c = u.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
						r = r ? `${r}
${u}` : u, i = i ? `${i}
${c}` : c;
						let g = this.lexer.state.top;
						if (this.lexer.state.top = !0, this.lexer.blockTokens(c, s, !0), this.lexer.state.top = g, n.length === 0) break;
						let h = s.at(-1);
						if (h?.type === "code") break;
						if (h?.type === "blockquote") {
							let R = h, f = R.raw + `
` + n.join(`
`), O = this.blockquote(f);
							s[s.length - 1] = O, r = r.substring(0, r.length - R.raw.length) + O.raw, i = i.substring(0, i.length - R.text.length) + O.text;
							break;
						} else if (h?.type === "list") {
							let R = h, f = R.raw + `
` + n.join(`
`), O = this.list(f);
							s[s.length - 1] = O, r = r.substring(0, r.length - h.raw.length) + O.raw, i = i.substring(0, i.length - R.raw.length) + O.raw, n = f.substring(s.at(-1).raw.length).split(`
`);
							continue;
						}
					}
					return {
						type: "blockquote",
						raw: r,
						tokens: s,
						text: i
					};
				}
			}
			list(e) {
				let t = this.rules.block.list.exec(e);
				if (t) {
					let n = t[1].trim(), r = n.length > 1, i = {
						type: "list",
						raw: "",
						ordered: r,
						start: r ? +n.slice(0, -1) : "",
						loose: !1,
						items: []
					};
					n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
					let s = this.rules.other.listItemRegex(n), a = !1;
					for (; e;) {
						let p = !1, u = "", c = "";
						if (!(t = s.exec(e)) || this.rules.block.hr.test(e)) break;
						u = t[0], e = e.substring(u.length);
						let g = t[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (H) => " ".repeat(3 * H.length)), h = e.split(`
`, 1)[0], R = !g.trim(), f = 0;
						if (this.options.pedantic ? (f = 2, c = g.trimStart()) : R ? f = t[1].length + 1 : (f = t[2].search(this.rules.other.nonSpaceChar), f = f > 4 ? 1 : f, c = g.slice(f), f += t[1].length), R && this.rules.other.blankLine.test(h) && (u += h + `
`, e = e.substring(h.length + 1), p = !0), !p) {
							let H = this.rules.other.nextBulletRegex(f), ee = this.rules.other.hrRegex(f), te = this.rules.other.fencesBeginRegex(f), ne = this.rules.other.headingBeginRegex(f), xe = this.rules.other.htmlBeginRegex(f);
							for (; e;) {
								let Z = e.split(`
`, 1)[0], A;
								if (h = Z, this.options.pedantic ? (h = h.replace(this.rules.other.listReplaceNesting, "  "), A = h) : A = h.replace(this.rules.other.tabCharGlobal, "    "), te.test(h) || ne.test(h) || xe.test(h) || H.test(h) || ee.test(h)) break;
								if (A.search(this.rules.other.nonSpaceChar) >= f || !h.trim()) c += `
` + A.slice(f);
								else {
									if (R || g.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || te.test(g) || ne.test(g) || ee.test(g)) break;
									c += `
` + h;
								}
								!R && !h.trim() && (R = !0), u += Z + `
`, e = e.substring(Z.length + 1), g = A.slice(f);
							}
						}
						i.loose || (a ? i.loose = !0 : this.rules.other.doubleBlankLine.test(u) && (a = !0));
						let O = null, Y;
						this.options.gfm && (O = this.rules.other.listIsTask.exec(c), O && (Y = O[0] !== "[ ] ", c = c.replace(this.rules.other.listReplaceTask, ""))), i.items.push({
							type: "list_item",
							raw: u,
							task: !!O,
							checked: Y,
							loose: !1,
							text: c,
							tokens: []
						}), i.raw += u;
					}
					let o = i.items.at(-1);
					if (o) o.raw = o.raw.trimEnd(), o.text = o.text.trimEnd();
					else return;
					i.raw = i.raw.trimEnd();
					for (let p = 0; p < i.items.length; p++) if (this.lexer.state.top = !1, i.items[p].tokens = this.lexer.blockTokens(i.items[p].text, []), !i.loose) {
						let u = i.items[p].tokens.filter((g) => g.type === "space");
						i.loose = u.length > 0 && u.some((g) => this.rules.other.anyLine.test(g.raw));
					}
					if (i.loose) for (let p = 0; p < i.items.length; p++) i.items[p].loose = !0;
					return i;
				}
			}
			html(e) {
				let t = this.rules.block.html.exec(e);
				if (t) return {
					type: "html",
					block: !0,
					raw: t[0],
					pre: t[1] === "pre" || t[1] === "script" || t[1] === "style",
					text: t[0]
				};
			}
			def(e) {
				let t = this.rules.block.def.exec(e);
				if (t) {
					let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), r = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", i = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
					return {
						type: "def",
						tag: n,
						raw: t[0],
						href: r,
						title: i
					};
				}
			}
			table(e) {
				let t = this.rules.block.table.exec(e);
				if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
				let n = V(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], s = {
					type: "table",
					raw: t[0],
					header: [],
					align: [],
					rows: []
				};
				if (n.length === r.length) {
					for (let a of r) this.rules.other.tableAlignRight.test(a) ? s.align.push("right") : this.rules.other.tableAlignCenter.test(a) ? s.align.push("center") : this.rules.other.tableAlignLeft.test(a) ? s.align.push("left") : s.align.push(null);
					for (let a = 0; a < n.length; a++) s.header.push({
						text: n[a],
						tokens: this.lexer.inline(n[a]),
						header: !0,
						align: s.align[a]
					});
					for (let a of i) s.rows.push(V(a, s.header.length).map((o, p) => ({
						text: o,
						tokens: this.lexer.inline(o),
						header: !1,
						align: s.align[p]
					})));
					return s;
				}
			}
			lheading(e) {
				let t = this.rules.block.lheading.exec(e);
				if (t) return {
					type: "heading",
					raw: t[0],
					depth: t[2].charAt(0) === "=" ? 1 : 2,
					text: t[1],
					tokens: this.lexer.inline(t[1])
				};
			}
			paragraph(e) {
				let t = this.rules.block.paragraph.exec(e);
				if (t) {
					let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
					return {
						type: "paragraph",
						raw: t[0],
						text: n,
						tokens: this.lexer.inline(n)
					};
				}
			}
			text(e) {
				let t = this.rules.block.text.exec(e);
				if (t) return {
					type: "text",
					raw: t[0],
					text: t[0],
					tokens: this.lexer.inline(t[0])
				};
			}
			escape(e) {
				let t = this.rules.inline.escape.exec(e);
				if (t) return {
					type: "escape",
					raw: t[0],
					text: t[1]
				};
			}
			tag(e) {
				let t = this.rules.inline.tag.exec(e);
				if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = !0 : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = !1), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = !0 : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = !1), {
					type: "html",
					raw: t[0],
					inLink: this.lexer.state.inLink,
					inRawBlock: this.lexer.state.inRawBlock,
					block: !1,
					text: t[0]
				};
			}
			link(e) {
				let t = this.rules.inline.link.exec(e);
				if (t) {
					let n = t[2].trim();
					if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
						if (!this.rules.other.endAngleBracket.test(n)) return;
						let s = z(n.slice(0, -1), "\\");
						if ((n.length - s.length) % 2 === 0) return;
					} else {
						let s = fe(t[2], "()");
						if (s === -2) return;
						if (s > -1) {
							let o = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + s;
							t[2] = t[2].substring(0, s), t[0] = t[0].substring(0, o).trim(), t[3] = "";
						}
					}
					let r = t[2], i = "";
					if (this.options.pedantic) {
						let s = this.rules.other.pedanticHrefTitle.exec(r);
						s && (r = s[1], i = s[3]);
					} else i = t[3] ? t[3].slice(1, -1) : "";
					return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? r = r.slice(1) : r = r.slice(1, -1)), me(t, {
						href: r && r.replace(this.rules.inline.anyPunctuation, "$1"),
						title: i && i.replace(this.rules.inline.anyPunctuation, "$1")
					}, t[0], this.lexer, this.rules);
				}
			}
			reflink(e, t) {
				let n;
				if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
					let i = t[(n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " ").toLowerCase()];
					if (!i) {
						let s = n[0].charAt(0);
						return {
							type: "text",
							raw: s,
							text: s
						};
					}
					return me(n, i, n[0], this.lexer, this.rules);
				}
			}
			emStrong(e, t, n = "") {
				let r = this.rules.inline.emStrongLDelim.exec(e);
				if (!r || r[3] && n.match(this.rules.other.unicodeAlphaNumeric)) return;
				if (!(r[1] || r[2] || "") || !n || this.rules.inline.punctuation.exec(n)) {
					let s = [...r[0]].length - 1, a, o, p = s, u = 0, c = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
					for (c.lastIndex = 0, t = t.slice(-1 * e.length + s); (r = c.exec(t)) != null;) {
						if (a = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !a) continue;
						if (o = [...a].length, r[3] || r[4]) {
							p += o;
							continue;
						} else if ((r[5] || r[6]) && s % 3 && !((s + o) % 3)) {
							u += o;
							continue;
						}
						if (p -= o, p > 0) continue;
						o = Math.min(o, o + p + u);
						let g = [...r[0]][0].length, h = e.slice(0, s + r.index + g + o);
						if (Math.min(s, o) % 2) {
							let f = h.slice(1, -1);
							return {
								type: "em",
								raw: h,
								text: f,
								tokens: this.lexer.inlineTokens(f)
							};
						}
						let R = h.slice(2, -2);
						return {
							type: "strong",
							raw: h,
							text: R,
							tokens: this.lexer.inlineTokens(R)
						};
					}
				}
			}
			codespan(e) {
				let t = this.rules.inline.code.exec(e);
				if (t) {
					let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), r = this.rules.other.nonSpaceChar.test(n), i = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
					return r && i && (n = n.substring(1, n.length - 1)), {
						type: "codespan",
						raw: t[0],
						text: n
					};
				}
			}
			br(e) {
				let t = this.rules.inline.br.exec(e);
				if (t) return {
					type: "br",
					raw: t[0]
				};
			}
			del(e) {
				let t = this.rules.inline.del.exec(e);
				if (t) return {
					type: "del",
					raw: t[0],
					text: t[2],
					tokens: this.lexer.inlineTokens(t[2])
				};
			}
			autolink(e) {
				let t = this.rules.inline.autolink.exec(e);
				if (t) {
					let n, r;
					return t[2] === "@" ? (n = t[1], r = "mailto:" + n) : (n = t[1], r = n), {
						type: "link",
						raw: t[0],
						text: n,
						href: r,
						tokens: [{
							type: "text",
							raw: n,
							text: n
						}]
					};
				}
			}
			url(e) {
				let t;
				if (t = this.rules.inline.url.exec(e)) {
					let n, r;
					if (t[2] === "@") n = t[0], r = "mailto:" + n;
					else {
						let i;
						do
							i = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
						while (i !== t[0]);
						n = t[0], t[1] === "www." ? r = "http://" + t[0] : r = t[0];
					}
					return {
						type: "link",
						raw: t[0],
						text: n,
						href: r,
						tokens: [{
							type: "text",
							raw: n,
							text: n
						}]
					};
				}
			}
			inlineText(e) {
				let t = this.rules.inline.text.exec(e);
				if (t) {
					let n = this.lexer.state.inRawBlock;
					return {
						type: "text",
						raw: t[0],
						text: t[0],
						escaped: n
					};
				}
			}
		};
		var x = class l {
			tokens;
			options;
			state;
			tokenizer;
			inlineQueue;
			constructor(e) {
				this.tokens = [], this.tokens.links = Object.create(null), this.options = e || T, this.options.tokenizer = this.options.tokenizer || new y(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = {
					inLink: !1,
					inRawBlock: !1,
					top: !0
				};
				let t = {
					other: m,
					block: C.normal,
					inline: M.normal
				};
				this.options.pedantic ? (t.block = C.pedantic, t.inline = M.pedantic) : this.options.gfm && (t.block = C.gfm, this.options.breaks ? t.inline = M.breaks : t.inline = M.gfm), this.tokenizer.rules = t;
			}
			static get rules() {
				return {
					block: C,
					inline: M
				};
			}
			static lex(e, t) {
				return new l(t).lex(e);
			}
			static lexInline(e, t) {
				return new l(t).inlineTokens(e);
			}
			lex(e) {
				e = e.replace(m.carriageReturn, `
`), this.blockTokens(e, this.tokens);
				for (let t = 0; t < this.inlineQueue.length; t++) {
					let n = this.inlineQueue[t];
					this.inlineTokens(n.src, n.tokens);
				}
				return this.inlineQueue = [], this.tokens;
			}
			blockTokens(e, t = [], n = !1) {
				for (this.options.pedantic && (e = e.replace(m.tabCharGlobal, "    ").replace(m.spaceLine, "")); e;) {
					let r;
					if (this.options.extensions?.block?.some((s) => (r = s.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), !0) : !1)) continue;
					if (r = this.tokenizer.space(e)) {
						e = e.substring(r.raw.length);
						let s = t.at(-1);
						r.raw.length === 1 && s !== void 0 ? s.raw += `
` : t.push(r);
						continue;
					}
					if (r = this.tokenizer.code(e)) {
						e = e.substring(r.raw.length);
						let s = t.at(-1);
						s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.at(-1).src = s.text) : t.push(r);
						continue;
					}
					if (r = this.tokenizer.fences(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.heading(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.hr(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.blockquote(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.list(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.html(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.def(e)) {
						e = e.substring(r.raw.length);
						let s = t.at(-1);
						s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = {
							href: r.href,
							title: r.title
						}, t.push(r));
						continue;
					}
					if (r = this.tokenizer.table(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.lheading(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					let i = e;
					if (this.options.extensions?.startBlock) {
						let s = Infinity, a = e.slice(1), o;
						this.options.extensions.startBlock.forEach((p) => {
							o = p.call({ lexer: this }, a), typeof o == "number" && o >= 0 && (s = Math.min(s, o));
						}), s < Infinity && s >= 0 && (i = e.substring(0, s + 1));
					}
					if (this.state.top && (r = this.tokenizer.paragraph(i))) {
						let s = t.at(-1);
						n && s?.type === "paragraph" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r), n = i.length !== e.length, e = e.substring(r.raw.length);
						continue;
					}
					if (r = this.tokenizer.text(e)) {
						e = e.substring(r.raw.length);
						let s = t.at(-1);
						s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r);
						continue;
					}
					if (e) {
						let s = "Infinite loop on byte: " + e.charCodeAt(0);
						if (this.options.silent) {
							console.error(s);
							break;
						} else throw new Error(s);
					}
				}
				return this.state.top = !0, t;
			}
			inline(e, t = []) {
				return this.inlineQueue.push({
					src: e,
					tokens: t
				}), t;
			}
			inlineTokens(e, t = []) {
				let n = e, r = null;
				if (this.tokens.links) {
					let o = Object.keys(this.tokens.links);
					if (o.length > 0) for (; (r = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null;) o.includes(r[0].slice(r[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
				}
				for (; (r = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null;) n = n.slice(0, r.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
				let i;
				for (; (r = this.tokenizer.rules.inline.blockSkip.exec(n)) != null;) i = r[2] ? r[2].length : 0, n = n.slice(0, r.index + i) + "[" + "a".repeat(r[0].length - i - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
				n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
				let s = !1, a = "";
				for (; e;) {
					s || (a = ""), s = !1;
					let o;
					if (this.options.extensions?.inline?.some((u) => (o = u.call({ lexer: this }, e, t)) ? (e = e.substring(o.raw.length), t.push(o), !0) : !1)) continue;
					if (o = this.tokenizer.escape(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.tag(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.link(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.reflink(e, this.tokens.links)) {
						e = e.substring(o.raw.length);
						let u = t.at(-1);
						o.type === "text" && u?.type === "text" ? (u.raw += o.raw, u.text += o.text) : t.push(o);
						continue;
					}
					if (o = this.tokenizer.emStrong(e, n, a)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.codespan(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.br(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.del(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.autolink(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (!this.state.inLink && (o = this.tokenizer.url(e))) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					let p = e;
					if (this.options.extensions?.startInline) {
						let u = Infinity, c = e.slice(1), g;
						this.options.extensions.startInline.forEach((h) => {
							g = h.call({ lexer: this }, c), typeof g == "number" && g >= 0 && (u = Math.min(u, g));
						}), u < Infinity && u >= 0 && (p = e.substring(0, u + 1));
					}
					if (o = this.tokenizer.inlineText(p)) {
						e = e.substring(o.raw.length), o.raw.slice(-1) !== "_" && (a = o.raw.slice(-1)), s = !0;
						let u = t.at(-1);
						u?.type === "text" ? (u.raw += o.raw, u.text += o.text) : t.push(o);
						continue;
					}
					if (e) {
						let u = "Infinite loop on byte: " + e.charCodeAt(0);
						if (this.options.silent) {
							console.error(u);
							break;
						} else throw new Error(u);
					}
				}
				return t;
			}
		};
		var P = class {
			options;
			parser;
			constructor(e) {
				this.options = e || T;
			}
			space(e) {
				return "";
			}
			code({ text: e, lang: t, escaped: n }) {
				let r = (t || "").match(m.notSpaceStart)?.[0], i = e.replace(m.endingNewline, "") + `
`;
				return r ? "<pre><code class=\"language-" + w(r) + "\">" + (n ? i : w(i, !0)) + `</code></pre>
` : "<pre><code>" + (n ? i : w(i, !0)) + `</code></pre>
`;
			}
			blockquote({ tokens: e }) {
				return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
			}
			html({ text: e }) {
				return e;
			}
			def(e) {
				return "";
			}
			heading({ tokens: e, depth: t }) {
				return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
			}
			hr(e) {
				return `<hr>
`;
			}
			list(e) {
				let t = e.ordered, n = e.start, r = "";
				for (let a = 0; a < e.items.length; a++) {
					let o = e.items[a];
					r += this.listitem(o);
				}
				let i = t ? "ol" : "ul", s = t && n !== 1 ? " start=\"" + n + "\"" : "";
				return "<" + i + s + `>
` + r + "</" + i + `>
`;
			}
			listitem(e) {
				let t = "";
				if (e.task) {
					let n = this.checkbox({ checked: !!e.checked });
					e.loose ? e.tokens[0]?.type === "paragraph" ? (e.tokens[0].text = n + " " + e.tokens[0].text, e.tokens[0].tokens && e.tokens[0].tokens.length > 0 && e.tokens[0].tokens[0].type === "text" && (e.tokens[0].tokens[0].text = n + " " + w(e.tokens[0].tokens[0].text), e.tokens[0].tokens[0].escaped = !0)) : e.tokens.unshift({
						type: "text",
						raw: n + " ",
						text: n + " ",
						escaped: !0
					}) : t += n + " ";
				}
				return t += this.parser.parse(e.tokens, !!e.loose), `<li>${t}</li>
`;
			}
			checkbox({ checked: e }) {
				return "<input " + (e ? "checked=\"\" " : "") + "disabled=\"\" type=\"checkbox\">";
			}
			paragraph({ tokens: e }) {
				return `<p>${this.parser.parseInline(e)}</p>
`;
			}
			table(e) {
				let t = "", n = "";
				for (let i = 0; i < e.header.length; i++) n += this.tablecell(e.header[i]);
				t += this.tablerow({ text: n });
				let r = "";
				for (let i = 0; i < e.rows.length; i++) {
					let s = e.rows[i];
					n = "";
					for (let a = 0; a < s.length; a++) n += this.tablecell(s[a]);
					r += this.tablerow({ text: n });
				}
				return r && (r = `<tbody>${r}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + r + `</table>
`;
			}
			tablerow({ text: e }) {
				return `<tr>
${e}</tr>
`;
			}
			tablecell(e) {
				let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
				return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
			}
			strong({ tokens: e }) {
				return `<strong>${this.parser.parseInline(e)}</strong>`;
			}
			em({ tokens: e }) {
				return `<em>${this.parser.parseInline(e)}</em>`;
			}
			codespan({ text: e }) {
				return `<code>${w(e, !0)}</code>`;
			}
			br(e) {
				return "<br>";
			}
			del({ tokens: e }) {
				return `<del>${this.parser.parseInline(e)}</del>`;
			}
			link({ href: e, title: t, tokens: n }) {
				let r = this.parser.parseInline(n), i = J(e);
				if (i === null) return r;
				e = i;
				let s = "<a href=\"" + e + "\"";
				return t && (s += " title=\"" + w(t) + "\""), s += ">" + r + "</a>", s;
			}
			image({ href: e, title: t, text: n, tokens: r }) {
				r && (n = this.parser.parseInline(r, this.parser.textRenderer));
				let i = J(e);
				if (i === null) return w(n);
				e = i;
				let s = `<img src="${e}" alt="${n}"`;
				return t && (s += ` title="${w(t)}"`), s += ">", s;
			}
			text(e) {
				return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : w(e.text);
			}
		};
		var $ = class {
			strong({ text: e }) {
				return e;
			}
			em({ text: e }) {
				return e;
			}
			codespan({ text: e }) {
				return e;
			}
			del({ text: e }) {
				return e;
			}
			html({ text: e }) {
				return e;
			}
			text({ text: e }) {
				return e;
			}
			link({ text: e }) {
				return "" + e;
			}
			image({ text: e }) {
				return "" + e;
			}
			br() {
				return "";
			}
		};
		var b$1 = class l {
			options;
			renderer;
			textRenderer;
			constructor(e) {
				this.options = e || T, this.options.renderer = this.options.renderer || new P(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new $();
			}
			static parse(e, t) {
				return new l(t).parse(e);
			}
			static parseInline(e, t) {
				return new l(t).parseInline(e);
			}
			parse(e, t = !0) {
				let n = "";
				for (let r = 0; r < e.length; r++) {
					let i = e[r];
					if (this.options.extensions?.renderers?.[i.type]) {
						let a = i, o = this.options.extensions.renderers[a.type].call({ parser: this }, a);
						if (o !== !1 || ![
							"space",
							"hr",
							"heading",
							"code",
							"table",
							"blockquote",
							"list",
							"html",
							"def",
							"paragraph",
							"text"
						].includes(a.type)) {
							n += o || "";
							continue;
						}
					}
					let s = i;
					switch (s.type) {
						case "space":
							n += this.renderer.space(s);
							continue;
						case "hr":
							n += this.renderer.hr(s);
							continue;
						case "heading":
							n += this.renderer.heading(s);
							continue;
						case "code":
							n += this.renderer.code(s);
							continue;
						case "table":
							n += this.renderer.table(s);
							continue;
						case "blockquote":
							n += this.renderer.blockquote(s);
							continue;
						case "list":
							n += this.renderer.list(s);
							continue;
						case "html":
							n += this.renderer.html(s);
							continue;
						case "def":
							n += this.renderer.def(s);
							continue;
						case "paragraph":
							n += this.renderer.paragraph(s);
							continue;
						case "text": {
							let a = s, o = this.renderer.text(a);
							for (; r + 1 < e.length && e[r + 1].type === "text";) a = e[++r], o += `
` + this.renderer.text(a);
							t ? n += this.renderer.paragraph({
								type: "paragraph",
								raw: o,
								text: o,
								tokens: [{
									type: "text",
									raw: o,
									text: o,
									escaped: !0
								}]
							}) : n += o;
							continue;
						}
						default: {
							let a = "Token with \"" + s.type + "\" type was not found.";
							if (this.options.silent) return console.error(a), "";
							throw new Error(a);
						}
					}
				}
				return n;
			}
			parseInline(e, t = this.renderer) {
				let n = "";
				for (let r = 0; r < e.length; r++) {
					let i = e[r];
					if (this.options.extensions?.renderers?.[i.type]) {
						let a = this.options.extensions.renderers[i.type].call({ parser: this }, i);
						if (a !== !1 || ![
							"escape",
							"html",
							"link",
							"image",
							"strong",
							"em",
							"codespan",
							"br",
							"del",
							"text"
						].includes(i.type)) {
							n += a || "";
							continue;
						}
					}
					let s = i;
					switch (s.type) {
						case "escape":
							n += t.text(s);
							break;
						case "html":
							n += t.html(s);
							break;
						case "link":
							n += t.link(s);
							break;
						case "image":
							n += t.image(s);
							break;
						case "strong":
							n += t.strong(s);
							break;
						case "em":
							n += t.em(s);
							break;
						case "codespan":
							n += t.codespan(s);
							break;
						case "br":
							n += t.br(s);
							break;
						case "del":
							n += t.del(s);
							break;
						case "text":
							n += t.text(s);
							break;
						default: {
							let a = "Token with \"" + s.type + "\" type was not found.";
							if (this.options.silent) return console.error(a), "";
							throw new Error(a);
						}
					}
				}
				return n;
			}
		};
		var S = class {
			options;
			block;
			constructor(e) {
				this.options = e || T;
			}
			static passThroughHooks = /* @__PURE__ */ new Set([
				"preprocess",
				"postprocess",
				"processAllTokens",
				"emStrongMask"
			]);
			static passThroughHooksRespectAsync = /* @__PURE__ */ new Set([
				"preprocess",
				"postprocess",
				"processAllTokens"
			]);
			preprocess(e) {
				return e;
			}
			postprocess(e) {
				return e;
			}
			processAllTokens(e) {
				return e;
			}
			emStrongMask(e) {
				return e;
			}
			provideLexer() {
				return this.block ? x.lex : x.lexInline;
			}
			provideParser() {
				return this.block ? b$1.parse : b$1.parseInline;
			}
		};
		var B = class {
			defaults = L();
			options = this.setOptions;
			parse = this.parseMarkdown(!0);
			parseInline = this.parseMarkdown(!1);
			Parser = b$1;
			Renderer = P;
			TextRenderer = $;
			Lexer = x;
			Tokenizer = y;
			Hooks = S;
			constructor(...e) {
				this.use(...e);
			}
			walkTokens(e, t) {
				let n = [];
				for (let r of e) switch (n = n.concat(t.call(this, r)), r.type) {
					case "table": {
						let i = r;
						for (let s of i.header) n = n.concat(this.walkTokens(s.tokens, t));
						for (let s of i.rows) for (let a of s) n = n.concat(this.walkTokens(a.tokens, t));
						break;
					}
					case "list": {
						let i = r;
						n = n.concat(this.walkTokens(i.items, t));
						break;
					}
					default: {
						let i = r;
						this.defaults.extensions?.childTokens?.[i.type] ? this.defaults.extensions.childTokens[i.type].forEach((s) => {
							let a = i[s].flat(Infinity);
							n = n.concat(this.walkTokens(a, t));
						}) : i.tokens && (n = n.concat(this.walkTokens(i.tokens, t)));
					}
				}
				return n;
			}
			use(...e) {
				let t = this.defaults.extensions || {
					renderers: {},
					childTokens: {}
				};
				return e.forEach((n) => {
					let r = { ...n };
					if (r.async = this.defaults.async || r.async || !1, n.extensions && (n.extensions.forEach((i) => {
						if (!i.name) throw new Error("extension name required");
						if ("renderer" in i) {
							let s = t.renderers[i.name];
							s ? t.renderers[i.name] = function(...a) {
								let o = i.renderer.apply(this, a);
								return o === !1 && (o = s.apply(this, a)), o;
							} : t.renderers[i.name] = i.renderer;
						}
						if ("tokenizer" in i) {
							if (!i.level || i.level !== "block" && i.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
							let s = t[i.level];
							s ? s.unshift(i.tokenizer) : t[i.level] = [i.tokenizer], i.start && (i.level === "block" ? t.startBlock ? t.startBlock.push(i.start) : t.startBlock = [i.start] : i.level === "inline" && (t.startInline ? t.startInline.push(i.start) : t.startInline = [i.start]));
						}
						"childTokens" in i && i.childTokens && (t.childTokens[i.name] = i.childTokens);
					}), r.extensions = t), n.renderer) {
						let i = this.defaults.renderer || new P(this.defaults);
						for (let s in n.renderer) {
							if (!(s in i)) throw new Error(`renderer '${s}' does not exist`);
							if (["options", "parser"].includes(s)) continue;
							let a = s, o = n.renderer[a], p = i[a];
							i[a] = (...u) => {
								let c = o.apply(i, u);
								return c === !1 && (c = p.apply(i, u)), c || "";
							};
						}
						r.renderer = i;
					}
					if (n.tokenizer) {
						let i = this.defaults.tokenizer || new y(this.defaults);
						for (let s in n.tokenizer) {
							if (!(s in i)) throw new Error(`tokenizer '${s}' does not exist`);
							if ([
								"options",
								"rules",
								"lexer"
							].includes(s)) continue;
							let a = s, o = n.tokenizer[a], p = i[a];
							i[a] = (...u) => {
								let c = o.apply(i, u);
								return c === !1 && (c = p.apply(i, u)), c;
							};
						}
						r.tokenizer = i;
					}
					if (n.hooks) {
						let i = this.defaults.hooks || new S();
						for (let s in n.hooks) {
							if (!(s in i)) throw new Error(`hook '${s}' does not exist`);
							if (["options", "block"].includes(s)) continue;
							let a = s, o = n.hooks[a], p = i[a];
							S.passThroughHooks.has(s) ? i[a] = (u) => {
								if (this.defaults.async && S.passThroughHooksRespectAsync.has(s)) return (async () => {
									let g = await o.call(i, u);
									return p.call(i, g);
								})();
								let c = o.call(i, u);
								return p.call(i, c);
							} : i[a] = (...u) => {
								if (this.defaults.async) return (async () => {
									let g = await o.apply(i, u);
									return g === !1 && (g = await p.apply(i, u)), g;
								})();
								let c = o.apply(i, u);
								return c === !1 && (c = p.apply(i, u)), c;
							};
						}
						r.hooks = i;
					}
					if (n.walkTokens) {
						let i = this.defaults.walkTokens, s = n.walkTokens;
						r.walkTokens = function(a) {
							let o = [];
							return o.push(s.call(this, a)), i && (o = o.concat(i.call(this, a))), o;
						};
					}
					this.defaults = {
						...this.defaults,
						...r
					};
				}), this;
			}
			setOptions(e) {
				return this.defaults = {
					...this.defaults,
					...e
				}, this;
			}
			lexer(e, t) {
				return x.lex(e, t ?? this.defaults);
			}
			parser(e, t) {
				return b$1.parse(e, t ?? this.defaults);
			}
			parseMarkdown(e) {
				return (n, r) => {
					let i = { ...r }, s = {
						...this.defaults,
						...i
					}, a = this.onError(!!s.silent, !!s.async);
					if (this.defaults.async === !0 && i.async === !1) return a(/* @__PURE__ */ new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
					if (typeof n > "u" || n === null) return a(/* @__PURE__ */ new Error("marked(): input parameter is undefined or null"));
					if (typeof n != "string") return a(/* @__PURE__ */ new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
					if (s.hooks && (s.hooks.options = s, s.hooks.block = e), s.async) return (async () => {
						let o = s.hooks ? await s.hooks.preprocess(n) : n, u = await (s.hooks ? await s.hooks.provideLexer() : e ? x.lex : x.lexInline)(o, s), c = s.hooks ? await s.hooks.processAllTokens(u) : u;
						s.walkTokens && await Promise.all(this.walkTokens(c, s.walkTokens));
						let h = await (s.hooks ? await s.hooks.provideParser() : e ? b$1.parse : b$1.parseInline)(c, s);
						return s.hooks ? await s.hooks.postprocess(h) : h;
					})().catch(a);
					try {
						s.hooks && (n = s.hooks.preprocess(n));
						let p = (s.hooks ? s.hooks.provideLexer() : e ? x.lex : x.lexInline)(n, s);
						s.hooks && (p = s.hooks.processAllTokens(p)), s.walkTokens && this.walkTokens(p, s.walkTokens);
						let c = (s.hooks ? s.hooks.provideParser() : e ? b$1.parse : b$1.parseInline)(p, s);
						return s.hooks && (c = s.hooks.postprocess(c)), c;
					} catch (o) {
						return a(o);
					}
				};
			}
			onError(e, t) {
				return (n) => {
					if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
						let r = "<p>An error occurred:</p><pre>" + w(n.message + "", !0) + "</pre>";
						return t ? Promise.resolve(r) : r;
					}
					if (t) return Promise.reject(n);
					throw n;
				};
			}
		};
		var _ = new B();
		function k$1(l, e) {
			return _.parse(l, e);
		}
		k$1.options = k$1.setOptions = function(l) {
			return _.setOptions(l), k$1.defaults = _.defaults, G(k$1.defaults), k$1;
		};
		k$1.getDefaults = L;
		k$1.defaults = T;
		k$1.use = function(...l) {
			return _.use(...l), k$1.defaults = _.defaults, G(k$1.defaults), k$1;
		};
		k$1.walkTokens = function(l, e) {
			return _.walkTokens(l, e);
		};
		k$1.parseInline = _.parseInline;
		k$1.Parser = b$1;
		k$1.parser = b$1.parse;
		k$1.Renderer = P;
		k$1.TextRenderer = $;
		k$1.Lexer = x;
		k$1.lexer = x.lex;
		k$1.Tokenizer = y;
		k$1.Hooks = S;
		k$1.parse = k$1;
		k$1.options;
		k$1.setOptions;
		k$1.use;
		k$1.walkTokens;
		k$1.parseInline;
		b$1.parse;
		x.lex;
		//#endregion
		//#region src/import/tavern-helper.ts
		function object$1(value, path) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${path} must be an object`);
			return value;
		}
		/** Preserve one JSON object used as a Tavern Helper variable namespace. */
		function tavernHelperVariables(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		/** Flatten one Tavern Helper script tree while applying folder enablement. */
		function parseTavernHelperScripts(values, path, parentEnabled = true) {
			return values.flatMap((value, index) => {
				const itemPath = `${path}[${index}]`;
				const item = object$1(value, itemPath);
				const enabled = parentEnabled && item.enabled !== false;
				if (item.type === "folder" || Array.isArray(item.scripts)) {
					if (!Array.isArray(item.scripts)) return [];
					return parseTavernHelperScripts(item.scripts, `${itemPath}.scripts`, enabled);
				}
				const content = typeof item.content === "string" ? item.content : "";
				const name = typeof item.name === "string" ? item.name : "";
				const id = typeof item.id === "string" && item.id !== "" ? item.id : `${itemPath}:${name}`;
				const button = tavernHelperVariables(item.button);
				const buttons = Array.isArray(button.buttons) ? button.buttons.flatMap((entry) => {
					const parsed = tavernHelperVariables(entry);
					return typeof parsed.name === "string" ? [{
						name: parsed.name,
						visible: parsed.visible !== false
					}] : [];
				}) : [];
				return [{
					id,
					name,
					content,
					info: typeof item.info === "string" ? item.info : "",
					enabled,
					buttonEnabled: button.enabled !== false,
					buttons,
					data: tavernHelperVariables(item.data)
				}];
			});
		}
		//#endregion
		//#region src/tavern-regex.ts
		function object(value, label) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} 必须是对象`);
			return value;
		}
		function string(value, label) {
			if (typeof value !== "string") throw new Error(`${label} 必须是字符串`);
			return value;
		}
		function strings(value, label) {
			if (value === void 0) return [];
			if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`${label} 必须是字符串数组`);
			return [...value];
		}
		function depth(value, label) {
			if (value === void 0 || value === null) return null;
			if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} 必须是有限数字或 null`);
			return value;
		}
		/** Validate one complete item accepted by `replaceTavernRegexes`. */
		function importTavernRegex(value, index) {
			const regex = object(value, `预设正则 ${index + 1}`);
			const id = typeof regex.id === "string" && regex.id.trim() !== "" ? regex.id : void 0;
			const rawName = string(regex.script_name, `预设正则 ${index + 1}.script_name`);
			const source = object(regex.source, `预设正则 ${index + 1}.source`);
			const destination = object(regex.destination, `预设正则 ${index + 1}.destination`);
			const enabled = typeof regex.enabled === "boolean" ? regex.enabled : typeof regex.disabled === "boolean" ? !regex.disabled : true;
			return {
				...id === void 0 ? {} : { id },
				scriptName: rawName === "" ? `未命名-${id ?? index + 1}` : rawName,
				findRegex: string(regex.find_regex, `预设正则 ${index + 1}.find_regex`),
				replaceString: string(regex.replace_string, `预设正则 ${index + 1}.replace_string`),
				trimStrings: strings(regex.trim_strings, `预设正则 ${index + 1}.trim_strings`),
				placement: [
					...source.user_input === true ? [1] : [],
					...source.ai_output === true ? [2] : [],
					...source.slash_command === true ? [3] : [],
					...source.world_info === true ? [5] : [],
					...source.reasoning === true ? [6] : []
				],
				disabled: !enabled,
				markdownOnly: destination.display === true,
				promptOnly: destination.prompt === true,
				runOnEdit: regex.run_on_edit === true,
				substituteRegex: 0,
				minDepth: depth(regex.min_depth, `预设正则 ${index + 1}.min_depth`),
				maxDepth: depth(regex.max_depth, `预设正则 ${index + 1}.max_depth`)
			};
		}
		//#endregion
		//#region src/tavern-generation-protocol.ts
		/** Browser-safe request and response values for isolated Tavern Helper generation. */
		/** Same-origin endpoint used by approved Tavern Helper scripts. */
		const TAVERN_GENERATION_PATH = "/api/dsh-agent-rp/tavern/generate";
		/** Same-origin endpoint used to inspect the prompts assembled for one script generation. */
		const TAVERN_PROMPT_PREVIEW_PATH = "/api/dsh-agent-rp/tavern/prompt";
		/** Same-origin endpoint used to query one user-approved OpenAI-compatible API. */
		const TAVERN_MODEL_LIST_PATH = "/api/dsh-agent-rp/tavern/models";
		//#endregion
		//#region node_modules/.pnpm/es-module-lexer@1.7.0/node_modules/es-module-lexer/dist/lexer.asm.js
		let e;
		let a;
		let r;
		let i = 2 << 19;
		const s = 1 === new Uint8Array(new Uint16Array([1]).buffer)[0] ? function(e, a) {
			const r = e.length;
			let i = 0;
			for (; i < r;) a[i] = e.charCodeAt(i++);
		} : function(e, a) {
			const r = e.length;
			let i = 0;
			for (; i < r;) {
				const r = e.charCodeAt(i);
				a[i++] = (255 & r) << 8 | r >>> 8;
			}
		};
		const f = "xportmportlassforetaourceeferromsyncunctionssertvoyiedelecontininstantybreareturdebuggeawaithrwhileifcatcfinallels";
		let t;
		let c;
		let n;
		function parse(k, l = "@") {
			t = k, c = l;
			const u = 2 * t.length + (2 << 18);
			if (u > i || !e) {
				for (; u > i;) i *= 2;
				a = new ArrayBuffer(i), s(f, new Uint16Array(a, 16, 114)), e = function(e, a, r) {
					"use asm";
					var i = new e.Int8Array(r), s = new e.Int16Array(r), f = new e.Int32Array(r), t = new e.Uint8Array(r);
					new e.Uint16Array(r);
					var n = 1040;
					function b() {
						var e = 0, a = 0, r = 0, t = 0, c = 0, b = 0, u = 0;
						u = n;
						n = n + 10240 | 0;
						i[812] = 1;
						i[811] = 0;
						s[403] = 0;
						s[404] = 0;
						f[71] = f[2];
						i[813] = 0;
						f[70] = 0;
						i[810] = 0;
						f[72] = u + 2048;
						f[73] = u;
						i[814] = 0;
						e = (f[3] | 0) + -2 | 0;
						f[74] = e;
						a = e + (f[68] << 1) | 0;
						f[75] = a;
						e: while (1) {
							r = e + 2 | 0;
							f[74] = r;
							if (e >>> 0 >= a >>> 0) {
								t = 18;
								break;
							}
							a: do
								switch (s[r >> 1] | 0) {
									case 9:
									case 10:
									case 11:
									case 12:
									case 13:
									case 32: break;
									case 101:
										if ((((s[404] | 0) == 0 ? H(r) | 0 : 0) ? (m(e + 4 | 0, 16, 10) | 0) == 0 : 0) ? (k(), (i[812] | 0) == 0) : 0) {
											t = 9;
											break e;
										} else t = 17;
										break;
									case 105:
										if (H(r) | 0 ? (m(e + 4 | 0, 26, 10) | 0) == 0 : 0) {
											l();
											t = 17;
										} else t = 17;
										break;
									case 59:
										t = 17;
										break;
									case 47: switch (s[e + 4 >> 1] | 0) {
										case 47:
											P();
											break a;
										case 42:
											y(1);
											break a;
										default:
											t = 16;
											break e;
									}
									default:
										t = 16;
										break e;
								}
							while (0);
							if ((t | 0) == 17) {
								t = 0;
								f[71] = f[74];
							}
							e = f[74] | 0;
							a = f[75] | 0;
						}
						if ((t | 0) == 9) {
							e = f[74] | 0;
							f[71] = e;
							t = 19;
						} else if ((t | 0) == 16) {
							i[812] = 0;
							f[74] = e;
							t = 19;
						} else if ((t | 0) == 18) if (!(i[810] | 0)) {
							e = r;
							t = 19;
						} else e = 0;
						do
							if ((t | 0) == 19) {
								e: while (1) {
									a = e + 2 | 0;
									f[74] = a;
									if (e >>> 0 >= (f[75] | 0) >>> 0) {
										t = 92;
										break;
									}
									a: do
										switch (s[a >> 1] | 0) {
											case 9:
											case 10:
											case 11:
											case 12:
											case 13:
											case 32: break;
											case 101:
												if (((s[404] | 0) == 0 ? H(a) | 0 : 0) ? (m(e + 4 | 0, 16, 10) | 0) == 0 : 0) {
													k();
													t = 91;
												} else t = 91;
												break;
											case 105:
												if (H(a) | 0 ? (m(e + 4 | 0, 26, 10) | 0) == 0 : 0) {
													l();
													t = 91;
												} else t = 91;
												break;
											case 99:
												if ((H(a) | 0 ? (m(e + 4 | 0, 36, 8) | 0) == 0 : 0) ? V(s[e + 12 >> 1] | 0) | 0 : 0) {
													i[814] = 1;
													t = 91;
												} else t = 91;
												break;
											case 40:
												r = f[72] | 0;
												e = s[404] | 0;
												t = e & 65535;
												f[r + (t << 3) >> 2] = 1;
												a = f[71] | 0;
												s[404] = e + 1 << 16 >> 16;
												f[r + (t << 3) + 4 >> 2] = a;
												t = 91;
												break;
											case 41:
												a = s[404] | 0;
												if (!(a << 16 >> 16)) {
													t = 36;
													break e;
												}
												r = a + -1 << 16 >> 16;
												s[404] = r;
												t = s[403] | 0;
												a = t & 65535;
												if (t << 16 >> 16 != 0 ? (f[(f[72] | 0) + ((r & 65535) << 3) >> 2] | 0) == 5 : 0) {
													a = f[(f[73] | 0) + (a + -1 << 2) >> 2] | 0;
													r = a + 4 | 0;
													if (!(f[r >> 2] | 0)) f[r >> 2] = (f[71] | 0) + 2;
													f[a + 12 >> 2] = e + 4;
													s[403] = t + -1 << 16 >> 16;
													t = 91;
												} else t = 91;
												break;
											case 123:
												t = f[71] | 0;
												r = f[65] | 0;
												e = t;
												do
													if ((s[t >> 1] | 0) == 41 & (r | 0) != 0 ? (f[r + 4 >> 2] | 0) == (t | 0) : 0) {
														a = f[66] | 0;
														f[65] = a;
														if (!a) {
															f[61] = 0;
															break;
														} else {
															f[a + 32 >> 2] = 0;
															break;
														}
													}
												while (0);
												r = f[72] | 0;
												a = s[404] | 0;
												t = a & 65535;
												f[r + (t << 3) >> 2] = (i[814] | 0) == 0 ? 2 : 6;
												s[404] = a + 1 << 16 >> 16;
												f[r + (t << 3) + 4 >> 2] = e;
												i[814] = 0;
												t = 91;
												break;
											case 125:
												e = s[404] | 0;
												if (!(e << 16 >> 16)) {
													t = 49;
													break e;
												}
												r = f[72] | 0;
												t = e + -1 << 16 >> 16;
												s[404] = t;
												if ((f[r + ((t & 65535) << 3) >> 2] | 0) == 4) {
													h();
													t = 91;
												} else t = 91;
												break;
											case 39:
												v(39);
												t = 91;
												break;
											case 34:
												v(34);
												t = 91;
												break;
											case 47: switch (s[e + 4 >> 1] | 0) {
												case 47:
													P();
													break a;
												case 42:
													y(1);
													break a;
												default:
													e = f[71] | 0;
													a = s[e >> 1] | 0;
													r: do
														if (!(U(a) | 0)) if (a << 16 >> 16 == 41) {
															r = s[404] | 0;
															if (!(D(f[(f[72] | 0) + ((r & 65535) << 3) + 4 >> 2] | 0) | 0)) t = 65;
														} else t = 64;
														else switch (a << 16 >> 16) {
															case 46: if (((s[e + -2 >> 1] | 0) + -48 & 65535) < 10) {
																t = 64;
																break r;
															} else break r;
															case 43: if ((s[e + -2 >> 1] | 0) == 43) {
																t = 64;
																break r;
															} else break r;
															case 45: if ((s[e + -2 >> 1] | 0) == 45) {
																t = 64;
																break r;
															} else break r;
															default: break r;
														}
													while (0);
													if ((t | 0) == 64) {
														r = s[404] | 0;
														t = 65;
													}
													r: do
														if ((t | 0) == 65) {
															t = 0;
															if (r << 16 >> 16 != 0 ? (c = f[72] | 0, b = (r & 65535) + -1 | 0, a << 16 >> 16 == 102 ? (f[c + (b << 3) >> 2] | 0) == 1 : 0) : 0) {
																if ((s[e + -2 >> 1] | 0) == 111 ? $(f[c + (b << 3) + 4 >> 2] | 0, 44, 3) | 0 : 0) break;
															} else t = 69;
															if ((t | 0) == 69 ? a << 16 >> 16 == 125 : 0) {
																t = f[72] | 0;
																r = r & 65535;
																if (p(f[t + (r << 3) + 4 >> 2] | 0) | 0) break;
																if ((f[t + (r << 3) >> 2] | 0) == 6) break;
															}
															if (!(o(e) | 0)) {
																switch (a << 16 >> 16) {
																	case 0: break r;
																	case 47:
																		if (i[813] | 0) break r;
																		break;
																	default:
																}
																t = f[67] | 0;
																if ((t | 0 ? e >>> 0 >= (f[t >> 2] | 0) >>> 0 : 0) ? e >>> 0 <= (f[t + 4 >> 2] | 0) >>> 0 : 0) {
																	g();
																	i[813] = 0;
																	t = 91;
																	break a;
																}
																r = f[3] | 0;
																do {
																	if (e >>> 0 <= r >>> 0) break;
																	e = e + -2 | 0;
																	f[71] = e;
																	a = s[e >> 1] | 0;
																} while (!(E(a) | 0));
																if (F(a) | 0) {
																	do {
																		if (e >>> 0 <= r >>> 0) break;
																		e = e + -2 | 0;
																		f[71] = e;
																	} while (F(s[e >> 1] | 0) | 0);
																	if (j(e) | 0) {
																		g();
																		i[813] = 0;
																		t = 91;
																		break a;
																	}
																}
																i[813] = 1;
																t = 91;
																break a;
															}
														}
													while (0);
													g();
													i[813] = 0;
													t = 91;
													break a;
											}
											case 96:
												r = f[72] | 0;
												a = s[404] | 0;
												t = a & 65535;
												f[r + (t << 3) + 4 >> 2] = f[71];
												s[404] = a + 1 << 16 >> 16;
												f[r + (t << 3) >> 2] = 3;
												h();
												t = 91;
												break;
											default: t = 91;
										}
									while (0);
									if ((t | 0) == 91) {
										t = 0;
										f[71] = f[74];
									}
									e = f[74] | 0;
								}
								if ((t | 0) == 36) {
									T();
									e = 0;
									break;
								} else if ((t | 0) == 49) {
									T();
									e = 0;
									break;
								} else if ((t | 0) == 92) {
									e = (i[810] | 0) == 0 ? (s[403] | s[404]) << 16 >> 16 == 0 : 0;
									break;
								}
							}
						while (0);
						n = u;
						return e | 0;
					}
					function k() {
						var e = 0, a = 0, r = 0, t = 0, c = 0, n = 0, b = 0, k = 0, l = 0, o = 0, h = 0, d = 0, C = 0, g = 0;
						k = f[74] | 0;
						l = f[67] | 0;
						g = k + 12 | 0;
						f[74] = g;
						r = w(1) | 0;
						e = f[74] | 0;
						if (!((e | 0) == (g | 0) ? !(I(r) | 0) : 0)) C = 3;
						e: do
							if ((C | 0) == 3) {
								a: do
									switch (r << 16 >> 16) {
										case 123:
											f[74] = e + 2;
											e = w(1) | 0;
											a = f[74] | 0;
											while (1) {
												if (W(e) | 0) {
													v(e);
													e = (f[74] | 0) + 2 | 0;
													f[74] = e;
												} else {
													q(e) | 0;
													e = f[74] | 0;
												}
												w(1) | 0;
												e = A(a, e) | 0;
												if (e << 16 >> 16 == 44) {
													f[74] = (f[74] | 0) + 2;
													e = w(1) | 0;
												}
												if (e << 16 >> 16 == 125) {
													C = 15;
													break;
												}
												g = a;
												a = f[74] | 0;
												if ((a | 0) == (g | 0)) {
													C = 12;
													break;
												}
												if (a >>> 0 > (f[75] | 0) >>> 0) {
													C = 14;
													break;
												}
											}
											if ((C | 0) == 12) {
												T();
												break e;
											} else if ((C | 0) == 14) {
												T();
												break e;
											} else if ((C | 0) == 15) {
												i[811] = 1;
												f[74] = (f[74] | 0) + 2;
												break a;
											}
											break;
										case 42:
											f[74] = e + 2;
											w(1) | 0;
											g = f[74] | 0;
											A(g, g) | 0;
											break;
										default:
											i[812] = 0;
											switch (r << 16 >> 16) {
												case 100:
													k = e + 14 | 0;
													f[74] = k;
													switch ((w(1) | 0) << 16 >> 16) {
														case 97:
															a = f[74] | 0;
															if ((m(a + 2 | 0, 80, 8) | 0) == 0 ? (c = a + 10 | 0, F(s[c >> 1] | 0) | 0) : 0) {
																f[74] = c;
																w(0) | 0;
																C = 22;
															}
															break;
														case 102:
															C = 22;
															break;
														case 99:
															a = f[74] | 0;
															if (((m(a + 2 | 0, 36, 8) | 0) == 0 ? (t = a + 10 | 0, g = s[t >> 1] | 0, V(g) | 0 | g << 16 >> 16 == 123) : 0) ? (f[74] = t, n = w(1) | 0, n << 16 >> 16 != 123) : 0) {
																d = n;
																C = 31;
															}
															break;
														default:
													}
													r: do
														if ((C | 0) == 22 ? (b = f[74] | 0, (m(b + 2 | 0, 88, 14) | 0) == 0) : 0) {
															r = b + 16 | 0;
															a = s[r >> 1] | 0;
															if (!(V(a) | 0)) switch (a << 16 >> 16) {
																case 40:
																case 42: break;
																default: break r;
															}
															f[74] = r;
															a = w(1) | 0;
															if (a << 16 >> 16 == 42) {
																f[74] = (f[74] | 0) + 2;
																a = w(1) | 0;
															}
															if (a << 16 >> 16 != 40) {
																d = a;
																C = 31;
															}
														}
													while (0);
													if ((C | 0) == 31 ? (o = f[74] | 0, q(d) | 0, h = f[74] | 0, h >>> 0 > o >>> 0) : 0) {
														O(e, k, o, h);
														f[74] = (f[74] | 0) + -2;
														break e;
													}
													O(e, k, 0, 0);
													f[74] = e + 12;
													break e;
												case 97:
													f[74] = e + 10;
													w(0) | 0;
													e = f[74] | 0;
													C = 35;
													break;
												case 102:
													C = 35;
													break;
												case 99:
													if ((m(e + 2 | 0, 36, 8) | 0) == 0 ? (a = e + 10 | 0, E(s[a >> 1] | 0) | 0) : 0) {
														f[74] = a;
														g = w(1) | 0;
														C = f[74] | 0;
														q(g) | 0;
														g = f[74] | 0;
														O(C, g, C, g);
														f[74] = (f[74] | 0) + -2;
														break e;
													}
													e = e + 4 | 0;
													f[74] = e;
													break;
												case 108:
												case 118: break;
												default: break e;
											}
											if ((C | 0) == 35) {
												f[74] = e + 16;
												e = w(1) | 0;
												if (e << 16 >> 16 == 42) {
													f[74] = (f[74] | 0) + 2;
													e = w(1) | 0;
												}
												C = f[74] | 0;
												q(e) | 0;
												g = f[74] | 0;
												O(C, g, C, g);
												f[74] = (f[74] | 0) + -2;
												break e;
											}
											f[74] = e + 6;
											i[812] = 0;
											r = w(1) | 0;
											e = f[74] | 0;
											r = (q(r) | 32) << 16 >> 16 == 123;
											t = f[74] | 0;
											if (r) {
												f[74] = t + 2;
												g = w(1) | 0;
												e = f[74] | 0;
												q(g) | 0;
											}
											r: while (1) {
												a = f[74] | 0;
												if ((a | 0) == (e | 0)) break;
												O(e, a, e, a);
												a = w(1) | 0;
												if (r) switch (a << 16 >> 16) {
													case 93:
													case 125: break e;
													default:
												}
												e = f[74] | 0;
												if (a << 16 >> 16 != 44) {
													C = 51;
													break;
												}
												f[74] = e + 2;
												a = w(1) | 0;
												e = f[74] | 0;
												switch (a << 16 >> 16) {
													case 91:
													case 123:
														C = 51;
														break r;
													default:
												}
												q(a) | 0;
											}
											if ((C | 0) == 51) f[74] = e + -2;
											if (!r) break e;
											f[74] = t + -2;
											break e;
									}
								while (0);
								g = (w(1) | 0) << 16 >> 16 == 102;
								e = f[74] | 0;
								if (g ? (m(e + 2 | 0, 74, 6) | 0) == 0 : 0) {
									f[74] = e + 8;
									u(k, w(1) | 0, 0);
									e = (l | 0) == 0 ? 248 : l + 16 | 0;
									while (1) {
										e = f[e >> 2] | 0;
										if (!e) break e;
										f[e + 12 >> 2] = 0;
										f[e + 8 >> 2] = 0;
										e = e + 16 | 0;
									}
								}
								f[74] = e + -2;
							}
						while (0);
					}
					function l() {
						var e = 0, a = 0, r = 0, t = 0, c = 0, n = 0, b = 0;
						b = f[74] | 0;
						c = b + 12 | 0;
						f[74] = c;
						e = w(1) | 0;
						t = f[74] | 0;
						e: do
							if (e << 16 >> 16 != 46) {
								if (!(e << 16 >> 16 == 115 & t >>> 0 > c >>> 0)) {
									if (!(e << 16 >> 16 == 100 & t >>> 0 > (b + 10 | 0) >>> 0)) {
										t = 0;
										n = 28;
										break;
									}
									if (m(t + 2 | 0, 66, 8) | 0) {
										a = t;
										e = 100;
										t = 0;
										n = 59;
										break;
									}
									e = t + 10 | 0;
									if (!(V(s[e >> 1] | 0) | 0)) {
										a = t;
										e = 100;
										t = 0;
										n = 59;
										break;
									}
									f[74] = e;
									e = w(1) | 0;
									if (e << 16 >> 16 == 42) {
										e = 42;
										t = 2;
										n = 61;
										break;
									}
									f[74] = t;
									t = 0;
									n = 28;
									break;
								}
								if ((m(t + 2 | 0, 56, 10) | 0) == 0 ? (r = t + 12 | 0, V(s[r >> 1] | 0) | 0) : 0) {
									f[74] = r;
									e = w(1) | 0;
									a = f[74] | 0;
									if ((a | 0) != (r | 0)) {
										if (e << 16 >> 16 != 102) {
											t = 1;
											n = 28;
											break;
										}
										if (m(a + 2 | 0, 74, 6) | 0) {
											e = 102;
											t = 1;
											n = 59;
											break;
										}
										if (!(E(s[a + 8 >> 1] | 0) | 0)) {
											e = 102;
											t = 1;
											n = 59;
											break;
										}
									}
									f[74] = t;
									t = 0;
									n = 28;
								} else {
									a = t;
									e = 115;
									t = 0;
									n = 59;
								}
							} else {
								f[74] = t + 2;
								switch ((w(1) | 0) << 16 >> 16) {
									case 109:
										e = f[74] | 0;
										if (m(e + 2 | 0, 50, 6) | 0) break e;
										a = f[71] | 0;
										if (!(G(a) | 0) ? (s[a >> 1] | 0) == 46 : 0) break e;
										d(b, b, e + 8 | 0, 2);
										break e;
									case 115:
										e = f[74] | 0;
										if (m(e + 2 | 0, 56, 10) | 0) break e;
										a = f[71] | 0;
										if (!(G(a) | 0) ? (s[a >> 1] | 0) == 46 : 0) break e;
										f[74] = e + 12;
										e = w(1) | 0;
										t = 1;
										n = 28;
										break e;
									case 100:
										e = f[74] | 0;
										if (m(e + 2 | 0, 66, 8) | 0) break e;
										a = f[71] | 0;
										if (!(G(a) | 0) ? (s[a >> 1] | 0) == 46 : 0) break e;
										f[74] = e + 10;
										e = w(1) | 0;
										t = 2;
										n = 28;
										break e;
									default: break e;
								}
							}
						while (0);
						e: do
							if ((n | 0) == 28) {
								if (e << 16 >> 16 == 40) {
									r = f[72] | 0;
									a = s[404] | 0;
									c = a & 65535;
									f[r + (c << 3) >> 2] = 5;
									e = f[74] | 0;
									s[404] = a + 1 << 16 >> 16;
									f[r + (c << 3) + 4 >> 2] = e;
									if ((s[f[71] >> 1] | 0) == 46) break;
									f[74] = e + 2;
									a = w(1) | 0;
									d(b, f[74] | 0, 0, e);
									if (!t) e = f[65] | 0;
									else {
										e = f[65] | 0;
										f[e + 28 >> 2] = (t | 0) == 1 ? 5 : 7;
									}
									c = f[73] | 0;
									b = s[403] | 0;
									s[403] = b + 1 << 16 >> 16;
									f[c + ((b & 65535) << 2) >> 2] = e;
									switch (a << 16 >> 16) {
										case 39:
											v(39);
											break;
										case 34:
											v(34);
											break;
										default:
											f[74] = (f[74] | 0) + -2;
											break e;
									}
									e = (f[74] | 0) + 2 | 0;
									f[74] = e;
									switch ((w(1) | 0) << 16 >> 16) {
										case 44:
											f[74] = (f[74] | 0) + 2;
											w(1) | 0;
											c = f[65] | 0;
											f[c + 4 >> 2] = e;
											b = f[74] | 0;
											f[c + 16 >> 2] = b;
											i[c + 24 >> 0] = 1;
											f[74] = b + -2;
											break e;
										case 41:
											s[404] = (s[404] | 0) + -1 << 16 >> 16;
											b = f[65] | 0;
											f[b + 4 >> 2] = e;
											f[b + 12 >> 2] = (f[74] | 0) + 2;
											i[b + 24 >> 0] = 1;
											s[403] = (s[403] | 0) + -1 << 16 >> 16;
											break e;
										default:
											f[74] = (f[74] | 0) + -2;
											break e;
									}
								}
								if (!((t | 0) == 0 & e << 16 >> 16 == 123)) {
									switch (e << 16 >> 16) {
										case 42:
										case 39:
										case 34:
											n = 61;
											break e;
										default:
									}
									a = f[74] | 0;
									n = 59;
									break;
								}
								e = f[74] | 0;
								if (s[404] | 0) {
									f[74] = e + -2;
									break;
								}
								while (1) {
									if (e >>> 0 >= (f[75] | 0) >>> 0) break;
									e = w(1) | 0;
									if (!(W(e) | 0)) {
										if (e << 16 >> 16 == 125) {
											n = 49;
											break;
										}
									} else v(e);
									e = (f[74] | 0) + 2 | 0;
									f[74] = e;
								}
								if ((n | 0) == 49) f[74] = (f[74] | 0) + 2;
								c = (w(1) | 0) << 16 >> 16 == 102;
								e = f[74] | 0;
								if (c ? m(e + 2 | 0, 74, 6) | 0 : 0) {
									T();
									break;
								}
								f[74] = e + 8;
								e = w(1) | 0;
								if (W(e) | 0) {
									u(b, e, 0);
									break;
								} else {
									T();
									break;
								}
							}
						while (0);
						if ((n | 0) == 59) if ((a | 0) == (c | 0)) f[74] = b + 10;
						else n = 61;
						do
							if ((n | 0) == 61) {
								if (!((e << 16 >> 16 == 42 | (t | 0) != 2) & (s[404] | 0) == 0)) {
									f[74] = (f[74] | 0) + -2;
									break;
								}
								e = f[75] | 0;
								a = f[74] | 0;
								while (1) {
									if (a >>> 0 >= e >>> 0) {
										n = 68;
										break;
									}
									r = s[a >> 1] | 0;
									if (W(r) | 0) {
										n = 66;
										break;
									}
									n = a + 2 | 0;
									f[74] = n;
									a = n;
								}
								if ((n | 0) == 66) {
									u(b, r, t);
									break;
								} else if ((n | 0) == 68) {
									T();
									break;
								}
							}
						while (0);
					}
					function u(e, a, r) {
						e = e | 0;
						a = a | 0;
						r = r | 0;
						var i = 0, t = 0;
						i = (f[74] | 0) + 2 | 0;
						switch (a << 16 >> 16) {
							case 39:
								v(39);
								t = 5;
								break;
							case 34:
								v(34);
								t = 5;
								break;
							default: T();
						}
						do
							if ((t | 0) == 5) {
								d(e, i, f[74] | 0, 1);
								if ((r | 0) > 0) f[(f[65] | 0) + 28 >> 2] = (r | 0) == 1 ? 4 : 6;
								f[74] = (f[74] | 0) + 2;
								a = w(0) | 0;
								r = a << 16 >> 16 == 97;
								if (r) {
									i = f[74] | 0;
									if (m(i + 2 | 0, 102, 10) | 0) t = 13;
								} else {
									i = f[74] | 0;
									if (!(((a << 16 >> 16 == 119 ? (s[i + 2 >> 1] | 0) == 105 : 0) ? (s[i + 4 >> 1] | 0) == 116 : 0) ? (s[i + 6 >> 1] | 0) == 104 : 0)) t = 13;
								}
								if ((t | 0) == 13) {
									f[74] = i + -2;
									break;
								}
								f[74] = i + ((r ? 6 : 4) << 1);
								if ((w(1) | 0) << 16 >> 16 != 123) {
									f[74] = i;
									break;
								}
								r = f[74] | 0;
								a = r;
								e: while (1) {
									f[74] = a + 2;
									a = w(1) | 0;
									switch (a << 16 >> 16) {
										case 39:
											v(39);
											f[74] = (f[74] | 0) + 2;
											a = w(1) | 0;
											break;
										case 34:
											v(34);
											f[74] = (f[74] | 0) + 2;
											a = w(1) | 0;
											break;
										default: a = q(a) | 0;
									}
									if (a << 16 >> 16 != 58) {
										t = 22;
										break;
									}
									f[74] = (f[74] | 0) + 2;
									switch ((w(1) | 0) << 16 >> 16) {
										case 39:
											v(39);
											break;
										case 34:
											v(34);
											break;
										default:
											t = 26;
											break e;
									}
									f[74] = (f[74] | 0) + 2;
									switch ((w(1) | 0) << 16 >> 16) {
										case 125:
											t = 31;
											break e;
										case 44: break;
										default:
											t = 30;
											break e;
									}
									f[74] = (f[74] | 0) + 2;
									if ((w(1) | 0) << 16 >> 16 == 125) {
										t = 31;
										break;
									}
									a = f[74] | 0;
								}
								if ((t | 0) == 22) {
									f[74] = i;
									break;
								} else if ((t | 0) == 26) {
									f[74] = i;
									break;
								} else if ((t | 0) == 30) {
									f[74] = i;
									break;
								} else if ((t | 0) == 31) {
									t = f[65] | 0;
									f[t + 16 >> 2] = r;
									f[t + 12 >> 2] = (f[74] | 0) + 2;
									break;
								}
							}
						while (0);
					}
					function o(e) {
						e = e | 0;
						e: do
							switch (s[e >> 1] | 0) {
								case 100: switch (s[e + -2 >> 1] | 0) {
									case 105:
										e = $(e + -4 | 0, 112, 2) | 0;
										break e;
									case 108:
										e = $(e + -4 | 0, 116, 3) | 0;
										break e;
									default:
										e = 0;
										break e;
								}
								case 101: switch (s[e + -2 >> 1] | 0) {
									case 115: switch (s[e + -4 >> 1] | 0) {
										case 108:
											e = B(e + -6 | 0, 101) | 0;
											break e;
										case 97:
											e = B(e + -6 | 0, 99) | 0;
											break e;
										default:
											e = 0;
											break e;
									}
									case 116:
										e = $(e + -4 | 0, 122, 4) | 0;
										break e;
									case 117:
										e = $(e + -4 | 0, 130, 6) | 0;
										break e;
									default:
										e = 0;
										break e;
								}
								case 102:
									if ((s[e + -2 >> 1] | 0) == 111 ? (s[e + -4 >> 1] | 0) == 101 : 0) switch (s[e + -6 >> 1] | 0) {
										case 99:
											e = $(e + -8 | 0, 142, 6) | 0;
											break e;
										case 112:
											e = $(e + -8 | 0, 154, 2) | 0;
											break e;
										default:
											e = 0;
											break e;
									}
									else e = 0;
									break;
								case 107:
									e = $(e + -2 | 0, 158, 4) | 0;
									break;
								case 110:
									e = e + -2 | 0;
									if (B(e, 105) | 0) e = 1;
									else e = $(e, 166, 5) | 0;
									break;
								case 111:
									e = B(e + -2 | 0, 100) | 0;
									break;
								case 114:
									e = $(e + -2 | 0, 176, 7) | 0;
									break;
								case 116:
									e = $(e + -2 | 0, 190, 4) | 0;
									break;
								case 119: switch (s[e + -2 >> 1] | 0) {
									case 101:
										e = B(e + -4 | 0, 110) | 0;
										break e;
									case 111:
										e = $(e + -4 | 0, 198, 3) | 0;
										break e;
									default:
										e = 0;
										break e;
								}
								default: e = 0;
							}
						while (0);
						return e | 0;
					}
					function h() {
						var e = 0, a = 0, r = 0, i = 0;
						a = f[75] | 0;
						r = f[74] | 0;
						e: while (1) {
							e = r + 2 | 0;
							if (r >>> 0 >= a >>> 0) {
								a = 10;
								break;
							}
							switch (s[e >> 1] | 0) {
								case 96:
									a = 7;
									break e;
								case 36:
									if ((s[r + 4 >> 1] | 0) == 123) {
										a = 6;
										break e;
									}
									break;
								case 92:
									e = r + 4 | 0;
									break;
								default:
							}
							r = e;
						}
						if ((a | 0) == 6) {
							e = r + 4 | 0;
							f[74] = e;
							a = f[72] | 0;
							i = s[404] | 0;
							r = i & 65535;
							f[a + (r << 3) >> 2] = 4;
							s[404] = i + 1 << 16 >> 16;
							f[a + (r << 3) + 4 >> 2] = e;
						} else if ((a | 0) == 7) {
							f[74] = e;
							r = f[72] | 0;
							i = (s[404] | 0) + -1 << 16 >> 16;
							s[404] = i;
							if ((f[r + ((i & 65535) << 3) >> 2] | 0) != 3) T();
						} else if ((a | 0) == 10) {
							f[74] = e;
							T();
						}
					}
					function w(e) {
						e = e | 0;
						var a = 0, r = 0, i = 0;
						r = f[74] | 0;
						e: do {
							a = s[r >> 1] | 0;
							a: do
								if (a << 16 >> 16 != 47) if (e) if (V(a) | 0) break;
								else break e;
								else if (F(a) | 0) break;
								else break e;
								else switch (s[r + 2 >> 1] | 0) {
									case 47:
										P();
										break a;
									case 42:
										y(e);
										break a;
									default:
										a = 47;
										break e;
								}
							while (0);
							i = f[74] | 0;
							r = i + 2 | 0;
							f[74] = r;
						} while (i >>> 0 < (f[75] | 0) >>> 0);
						return a | 0;
					}
					function d(e, a, r, s) {
						e = e | 0;
						a = a | 0;
						r = r | 0;
						s = s | 0;
						var t = 0, c = 0;
						c = f[69] | 0;
						f[69] = c + 36;
						t = f[65] | 0;
						f[((t | 0) == 0 ? 244 : t + 32 | 0) >> 2] = c;
						f[66] = t;
						f[65] = c;
						f[c + 8 >> 2] = e;
						if (2 == (s | 0)) {
							e = 3;
							t = r;
						} else {
							t = 1 == (s | 0);
							e = t ? 1 : 2;
							t = t ? r + 2 | 0 : 0;
						}
						f[c + 12 >> 2] = t;
						f[c + 28 >> 2] = e;
						f[c >> 2] = a;
						f[c + 4 >> 2] = r;
						f[c + 16 >> 2] = 0;
						f[c + 20 >> 2] = s;
						a = 1 == (s | 0);
						i[c + 24 >> 0] = a & 1;
						f[c + 32 >> 2] = 0;
						if (a | 2 == (s | 0)) i[811] = 1;
					}
					function v(e) {
						e = e | 0;
						var a = 0, r = 0, i = 0, t = 0;
						t = f[75] | 0;
						a = f[74] | 0;
						while (1) {
							i = a + 2 | 0;
							if (a >>> 0 >= t >>> 0) {
								a = 9;
								break;
							}
							r = s[i >> 1] | 0;
							if (r << 16 >> 16 == e << 16 >> 16) {
								a = 10;
								break;
							}
							if (r << 16 >> 16 == 92) {
								r = a + 4 | 0;
								if ((s[r >> 1] | 0) == 13) {
									a = a + 6 | 0;
									a = (s[a >> 1] | 0) == 10 ? a : r;
								} else a = r;
							} else if (Z(r) | 0) {
								a = 9;
								break;
							} else a = i;
						}
						if ((a | 0) == 9) {
							f[74] = i;
							T();
						} else if ((a | 0) == 10) f[74] = i;
					}
					function A(e, a) {
						e = e | 0;
						a = a | 0;
						var r = 0, i = 0, t = 0, c = 0;
						r = f[74] | 0;
						i = s[r >> 1] | 0;
						c = (e | 0) == (a | 0);
						t = c ? 0 : e;
						c = c ? 0 : a;
						if (i << 16 >> 16 == 97) {
							f[74] = r + 4;
							r = w(1) | 0;
							e = f[74] | 0;
							if (W(r) | 0) {
								v(r);
								a = (f[74] | 0) + 2 | 0;
								f[74] = a;
							} else {
								q(r) | 0;
								a = f[74] | 0;
							}
							i = w(1) | 0;
							r = f[74] | 0;
						}
						if ((r | 0) != (e | 0)) O(e, a, t, c);
						return i | 0;
					}
					function C() {
						var e = 0, a = 0, r = 0;
						r = f[75] | 0;
						a = f[74] | 0;
						e: while (1) {
							e = a + 2 | 0;
							if (a >>> 0 >= r >>> 0) {
								a = 6;
								break;
							}
							switch (s[e >> 1] | 0) {
								case 13:
								case 10:
									a = 6;
									break e;
								case 93:
									a = 7;
									break e;
								case 92:
									e = a + 4 | 0;
									break;
								default:
							}
							a = e;
						}
						if ((a | 0) == 6) {
							f[74] = e;
							T();
							e = 0;
						} else if ((a | 0) == 7) {
							f[74] = e;
							e = 93;
						}
						return e | 0;
					}
					function g() {
						var e = 0, a = 0, r = 0;
						e: while (1) {
							e = f[74] | 0;
							a = e + 2 | 0;
							f[74] = a;
							if (e >>> 0 >= (f[75] | 0) >>> 0) {
								r = 7;
								break;
							}
							switch (s[a >> 1] | 0) {
								case 13:
								case 10:
									r = 7;
									break e;
								case 47: break e;
								case 91:
									C() | 0;
									break;
								case 92:
									f[74] = e + 4;
									break;
								default:
							}
						}
						if ((r | 0) == 7) T();
					}
					function p(e) {
						e = e | 0;
						switch (s[e >> 1] | 0) {
							case 62:
								e = (s[e + -2 >> 1] | 0) == 61;
								break;
							case 41:
							case 59:
								e = 1;
								break;
							case 104:
								e = $(e + -2 | 0, 218, 4) | 0;
								break;
							case 121:
								e = $(e + -2 | 0, 226, 6) | 0;
								break;
							case 101:
								e = $(e + -2 | 0, 238, 3) | 0;
								break;
							default: e = 0;
						}
						return e | 0;
					}
					function y(e) {
						e = e | 0;
						var a = 0, r = 0, i = 0, t = 0, c = 0;
						t = (f[74] | 0) + 2 | 0;
						f[74] = t;
						r = f[75] | 0;
						while (1) {
							a = t + 2 | 0;
							if (t >>> 0 >= r >>> 0) break;
							i = s[a >> 1] | 0;
							if (!e ? Z(i) | 0 : 0) break;
							if (i << 16 >> 16 == 42 ? (s[t + 4 >> 1] | 0) == 47 : 0) {
								c = 8;
								break;
							}
							t = a;
						}
						if ((c | 0) == 8) {
							f[74] = a;
							a = t + 4 | 0;
						}
						f[74] = a;
					}
					function m(e, a, r) {
						e = e | 0;
						a = a | 0;
						r = r | 0;
						var s = 0, f = 0;
						e: do
							if (!r) e = 0;
							else {
								while (1) {
									s = i[e >> 0] | 0;
									f = i[a >> 0] | 0;
									if (s << 24 >> 24 != f << 24 >> 24) break;
									r = r + -1 | 0;
									if (!r) {
										e = 0;
										break e;
									} else {
										e = e + 1 | 0;
										a = a + 1 | 0;
									}
								}
								e = (s & 255) - (f & 255) | 0;
							}
						while (0);
						return e | 0;
					}
					function I(e) {
						e = e | 0;
						e: do
							switch (e << 16 >> 16) {
								case 38:
								case 37:
								case 33:
									e = 1;
									break;
								default: if ((e & -8) << 16 >> 16 == 40 | (e + -58 & 65535) < 6) e = 1;
								else {
									switch (e << 16 >> 16) {
										case 91:
										case 93:
										case 94:
											e = 1;
											break e;
										default:
									}
									e = (e + -123 & 65535) < 4;
								}
							}
						while (0);
						return e | 0;
					}
					function U(e) {
						e = e | 0;
						e: do
							switch (e << 16 >> 16) {
								case 38:
								case 37:
								case 33: break;
								default: if (!((e + -58 & 65535) < 6 | (e + -40 & 65535) < 7 & e << 16 >> 16 != 41)) {
									switch (e << 16 >> 16) {
										case 91:
										case 94: break e;
										default:
									}
									return e << 16 >> 16 != 125 & (e + -123 & 65535) < 4 | 0;
								}
							}
						while (0);
						return 1;
					}
					function x(e) {
						e = e | 0;
						var a = 0;
						a = s[e >> 1] | 0;
						e: do
							if ((a + -9 & 65535) >= 5) {
								switch (a << 16 >> 16) {
									case 160:
									case 32:
										a = 1;
										break e;
									default:
								}
								if (I(a) | 0) return a << 16 >> 16 != 46 | (G(e) | 0) | 0;
								else a = 0;
							} else a = 1;
						while (0);
						return a | 0;
					}
					function S(e) {
						e = e | 0;
						var a = 0, r = 0, i = 0, t = 0;
						r = n;
						n = n + 16 | 0;
						i = r;
						f[i >> 2] = 0;
						f[68] = e;
						a = f[3] | 0;
						t = a + (e << 1) | 0;
						e = t + 2 | 0;
						s[t >> 1] = 0;
						f[i >> 2] = e;
						f[69] = e;
						f[61] = 0;
						f[65] = 0;
						f[63] = 0;
						f[62] = 0;
						f[67] = 0;
						f[64] = 0;
						n = r;
						return a | 0;
					}
					function O(e, a, r, s) {
						e = e | 0;
						a = a | 0;
						r = r | 0;
						s = s | 0;
						var t = 0, c = 0;
						t = f[69] | 0;
						f[69] = t + 20;
						c = f[67] | 0;
						f[((c | 0) == 0 ? 248 : c + 16 | 0) >> 2] = t;
						f[67] = t;
						f[t >> 2] = e;
						f[t + 4 >> 2] = a;
						f[t + 8 >> 2] = r;
						f[t + 12 >> 2] = s;
						f[t + 16 >> 2] = 0;
						i[811] = 1;
					}
					function $(e, a, r) {
						e = e | 0;
						a = a | 0;
						r = r | 0;
						var i = 0, s = 0;
						i = e + (0 - r << 1) | 0;
						s = i + 2 | 0;
						e = f[3] | 0;
						if (s >>> 0 >= e >>> 0 ? (m(s, a, r << 1) | 0) == 0 : 0) if ((s | 0) == (e | 0)) e = 1;
						else e = x(i) | 0;
						else e = 0;
						return e | 0;
					}
					function j(e) {
						e = e | 0;
						switch (s[e >> 1] | 0) {
							case 107:
								e = $(e + -2 | 0, 158, 4) | 0;
								break;
							case 101:
								if ((s[e + -2 >> 1] | 0) == 117) e = $(e + -4 | 0, 130, 6) | 0;
								else e = 0;
								break;
							default: e = 0;
						}
						return e | 0;
					}
					function B(e, a) {
						e = e | 0;
						a = a | 0;
						var r = 0;
						r = f[3] | 0;
						if (r >>> 0 <= e >>> 0 ? (s[e >> 1] | 0) == a << 16 >> 16 : 0) if ((r | 0) == (e | 0)) r = 1;
						else r = E(s[e + -2 >> 1] | 0) | 0;
						else r = 0;
						return r | 0;
					}
					function E(e) {
						e = e | 0;
						e: do
							if ((e + -9 & 65535) < 5) e = 1;
							else {
								switch (e << 16 >> 16) {
									case 32:
									case 160:
										e = 1;
										break e;
									default:
								}
								e = e << 16 >> 16 != 46 & (I(e) | 0);
							}
						while (0);
						return e | 0;
					}
					function P() {
						var e = 0, a = 0, r = 0;
						e = f[75] | 0;
						r = f[74] | 0;
						e: while (1) {
							a = r + 2 | 0;
							if (r >>> 0 >= e >>> 0) break;
							switch (s[a >> 1] | 0) {
								case 13:
								case 10: break e;
								default: r = a;
							}
						}
						f[74] = a;
					}
					function q(e) {
						e = e | 0;
						while (1) {
							if (V(e) | 0) break;
							if (I(e) | 0) break;
							e = (f[74] | 0) + 2 | 0;
							f[74] = e;
							e = s[e >> 1] | 0;
							if (!(e << 16 >> 16)) {
								e = 0;
								break;
							}
						}
						return e | 0;
					}
					function z() {
						var e = 0;
						e = f[(f[63] | 0) + 20 >> 2] | 0;
						switch (e | 0) {
							case 1:
								e = -1;
								break;
							case 2:
								e = -2;
								break;
							default: e = e - (f[3] | 0) >> 1;
						}
						return e | 0;
					}
					function D(e) {
						e = e | 0;
						if (!($(e, 204, 5) | 0) ? !($(e, 44, 3) | 0) : 0) e = $(e, 214, 2) | 0;
						else e = 1;
						return e | 0;
					}
					function F(e) {
						e = e | 0;
						switch (e << 16 >> 16) {
							case 160:
							case 32:
							case 12:
							case 11:
							case 9:
								e = 1;
								break;
							default: e = 0;
						}
						return e | 0;
					}
					function G(e) {
						e = e | 0;
						if ((s[e >> 1] | 0) == 46 ? (s[e + -2 >> 1] | 0) == 46 : 0) e = (s[e + -4 >> 1] | 0) == 46;
						else e = 0;
						return e | 0;
					}
					function H(e) {
						e = e | 0;
						if ((f[3] | 0) == (e | 0)) e = 1;
						else e = x(e + -2 | 0) | 0;
						return e | 0;
					}
					function J() {
						var e = 0;
						e = f[(f[64] | 0) + 12 >> 2] | 0;
						if (!e) e = -1;
						else e = e - (f[3] | 0) >> 1;
						return e | 0;
					}
					function K() {
						var e = 0;
						e = f[(f[63] | 0) + 12 >> 2] | 0;
						if (!e) e = -1;
						else e = e - (f[3] | 0) >> 1;
						return e | 0;
					}
					function L() {
						var e = 0;
						e = f[(f[64] | 0) + 8 >> 2] | 0;
						if (!e) e = -1;
						else e = e - (f[3] | 0) >> 1;
						return e | 0;
					}
					function M() {
						var e = 0;
						e = f[(f[63] | 0) + 16 >> 2] | 0;
						if (!e) e = -1;
						else e = e - (f[3] | 0) >> 1;
						return e | 0;
					}
					function N() {
						var e = 0;
						e = f[(f[63] | 0) + 4 >> 2] | 0;
						if (!e) e = -1;
						else e = e - (f[3] | 0) >> 1;
						return e | 0;
					}
					function Q() {
						var e = 0;
						e = f[63] | 0;
						e = f[((e | 0) == 0 ? 244 : e + 32 | 0) >> 2] | 0;
						f[63] = e;
						return (e | 0) != 0 | 0;
					}
					function R() {
						var e = 0;
						e = f[64] | 0;
						e = f[((e | 0) == 0 ? 248 : e + 16 | 0) >> 2] | 0;
						f[64] = e;
						return (e | 0) != 0 | 0;
					}
					function T() {
						i[810] = 1;
						f[70] = (f[74] | 0) - (f[3] | 0) >> 1;
						f[74] = (f[75] | 0) + 2;
					}
					function V(e) {
						e = e | 0;
						return (e | 128) << 16 >> 16 == 160 | (e + -9 & 65535) < 5 | 0;
					}
					function W(e) {
						e = e | 0;
						return e << 16 >> 16 == 39 | e << 16 >> 16 == 34 | 0;
					}
					function X() {
						return (f[(f[63] | 0) + 8 >> 2] | 0) - (f[3] | 0) >> 1 | 0;
					}
					function Y() {
						return (f[(f[64] | 0) + 4 >> 2] | 0) - (f[3] | 0) >> 1 | 0;
					}
					function Z(e) {
						e = e | 0;
						return e << 16 >> 16 == 13 | e << 16 >> 16 == 10 | 0;
					}
					function _() {
						return (f[f[63] >> 2] | 0) - (f[3] | 0) >> 1 | 0;
					}
					function ee() {
						return (f[f[64] >> 2] | 0) - (f[3] | 0) >> 1 | 0;
					}
					function ae() {
						return t[(f[63] | 0) + 24 >> 0] | 0;
					}
					function re(e) {
						e = e | 0;
						f[3] = e;
					}
					function ie() {
						return f[(f[63] | 0) + 28 >> 2] | 0;
					}
					function se() {
						return (i[811] | 0) != 0 | 0;
					}
					function fe() {
						return (i[812] | 0) != 0 | 0;
					}
					function te() {
						return f[70] | 0;
					}
					function ce(e) {
						e = e | 0;
						n = e + 992 + 15 & -16;
						return 992;
					}
					return {
						su: ce,
						ai: M,
						e: te,
						ee: Y,
						ele: J,
						els: L,
						es: ee,
						f: fe,
						id: z,
						ie: N,
						ip: ae,
						is: _,
						it: ie,
						ms: se,
						p: b,
						re: R,
						ri: Q,
						sa: S,
						se: K,
						ses: re,
						ss: X
					};
				}("undefined" != typeof self ? self : global, {}, a), r = e.su(i - (2 << 17));
			}
			const h = t.length + 1;
			e.ses(r), e.sa(h - 1), s(t, new Uint16Array(a, r, h)), e.p() || (n = e.e(), o());
			const w = [], d = [];
			for (; e.ri();) {
				const a = e.is(), r = e.ie(), i = e.ai(), s = e.id(), f = e.ss(), c = e.se(), n = e.it();
				let k;
				e.ip() && (k = b(-1 === s ? a : a + 1, t.charCodeAt(-1 === s ? a - 1 : a))), w.push({
					t: n,
					n: k,
					s: a,
					e: r,
					ss: f,
					se: c,
					d: s,
					a: i
				});
			}
			for (; e.re();) {
				const a = e.es(), r = e.ee(), i = e.els(), s = e.ele(), f = t.charCodeAt(a), c = i >= 0 ? t.charCodeAt(i) : -1;
				d.push({
					s: a,
					e: r,
					ls: i,
					le: s,
					n: 34 === f || 39 === f ? b(a + 1, f) : t.slice(a, r),
					ln: i < 0 ? void 0 : 34 === c || 39 === c ? b(i + 1, c) : t.slice(i, s)
				});
			}
			return [
				w,
				d,
				!!e.f(),
				!!e.ms()
			];
		}
		function b(e, a) {
			n = e;
			let r = "", i = n;
			for (;;) {
				n >= t.length && o();
				const e = t.charCodeAt(n);
				if (e === a) break;
				92 === e ? (r += t.slice(i, n), r += k(), i = n) : (8232 === e || 8233 === e || u(e) && o(), ++n);
			}
			return r += t.slice(i, n++), r;
		}
		function k() {
			let e = t.charCodeAt(++n);
			switch (++n, e) {
				case 110: return "\n";
				case 114: return "\r";
				case 120: return String.fromCharCode(l(2));
				case 117: return function() {
					const e = t.charCodeAt(n);
					let a;
					123 === e ? (++n, a = l(t.indexOf("}", n) - n), ++n, a > 1114111 && o()) : a = l(4);
					return a <= 65535 ? String.fromCharCode(a) : (a -= 65536, String.fromCharCode(55296 + (a >> 10), 56320 + (1023 & a)));
				}();
				case 116: return "	";
				case 98: return "\b";
				case 118: return "\v";
				case 102: return "\f";
				case 13: 10 === t.charCodeAt(n) && ++n;
				case 10: return "";
				case 56:
				case 57: o();
				default:
					if (e >= 48 && e <= 55) {
						let a = t.substr(n - 1, 3).match(/^[0-7]+/)[0], r = parseInt(a, 8);
						return r > 255 && (a = a.slice(0, -1), r = parseInt(a, 8)), n += a.length - 1, e = t.charCodeAt(n), "0" === a && 56 !== e && 57 !== e || o(), String.fromCharCode(r);
					}
					return u(e) ? "" : String.fromCharCode(e);
			}
		}
		function l(e) {
			const a = n;
			let r = 0, i = 0;
			for (let a = 0; a < e; ++a, ++n) {
				let e, s = t.charCodeAt(n);
				if (95 !== s) {
					if (s >= 97) e = s - 97 + 10;
					else if (s >= 65) e = s - 65 + 10;
					else {
						if (!(s >= 48 && s <= 57)) break;
						e = s - 48;
					}
					if (e >= 16) break;
					i = s, r = 16 * r + e;
				} else 95 !== i && 0 !== a || o(), i = s;
			}
			return 95 !== i && n - a === e || o(), r;
		}
		function u(e) {
			return 13 === e || 10 === e;
		}
		function o() {
			throw Object.assign(Error(`Parse error ${c}:${t.slice(0, n).split("\n").length}:${n - t.lastIndexOf("\n", n - 1)}`), { idx: n });
		}
		//#endregion
		//#region src/client/tavern-runtime.ts
		/** Signals that a valid HTTPS module origin needs player approval before loading. */
		var TavernScriptOriginApprovalError = class extends Error {
			/** Origin awaiting approval. */
			origin;
			constructor(origin) {
				super(`远程脚本来源需要授权：${origin}`);
				this.name = "TavernScriptOriginApprovalError";
				this.origin = origin;
			}
		};
		/**
		* Find messages appended after a previously observed transcript tail.
		*
		* A missing cursor establishes an initial baseline. If the old tail disappeared,
		* the transcript was rewritten and the new state becomes the baseline without
		* replaying historical messages.
		*/
		function advanceTavernTranscript(previous, messages) {
			const last = messages.at(-1);
			const cursor = last === void 0 ? {} : { last: {
				seq: last.seq,
				role: last.role
			} };
			if (previous === void 0) return {
				cursor,
				appended: []
			};
			if (previous.last === void 0) return {
				cursor,
				appended: messages
			};
			const anchor = messages.findIndex((message) => message.seq === previous.last.seq && message.role === previous.last.role);
			return {
				cursor,
				appended: anchor < 0 ? [] : messages.slice(anchor + 1)
			};
		}
		const remoteCache = /* @__PURE__ */ new Map();
		const MAX_REMOTE_CACHE_ENTRIES = 32;
		/** Script origins trusted by the built-in jsDelivr bundle resolver. */
		const BUILT_IN_TAVERN_SCRIPT_ORIGINS = ["https://cdn.jsdelivr.net", "https://testingcf.jsdelivr.net"];
		const DOMPURIFY_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/dompurify@3.3.0/dist/purify.min.js";
		const DOMPURIFY_SCRIPT_INTEGRITY = "sha384-+qi1h9Ene5uYXijovnRnDpm2TZiNyVFgYjKIqjw6id8zLdWYt+tCPG9/1u6yLaNj";
		const FUSE_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/fuse.js@7.1.0/dist/fuse.min.js";
		const FUSE_SCRIPT_INTEGRITY = "sha384-P/y/5cwqUn6MDvJ9lCHJSaAi2EoH3JSeEdyaORsQMPgbpvA+NvvUqik7XH2YGBjb";
		const ZOD_MODULE_URL = "https://cdn.jsdelivr.net/npm/zod@4.4.3/+esm";
		const YAML_MODULE_URL = "https://cdn.jsdelivr.net/npm/yaml@2.9.0/+esm";
		const MAX_REMOTE_SCRIPT_BYTES = 2 * 1024 * 1024;
		const MAX_REMOTE_SCRIPTS_BYTES = 4 * 1024 * 1024;
		function approvedOrigins(additional) {
			return new Set([...BUILT_IN_TAVERN_SCRIPT_ORIGINS, ...additional].map((value) => new URL(value).origin));
		}
		function approvedModuleUrl(specifier, origins) {
			let parsed;
			try {
				parsed = new URL(specifier);
			} catch {
				throw new Error(`远程模块必须使用完整 HTTPS 地址：${specifier}`);
			}
			if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") throw new Error(`远程模块必须使用完整 HTTPS 地址：${specifier}`);
			if (!origins.has(parsed.origin)) throw new TavernScriptOriginApprovalError(parsed.origin);
			return parsed;
		}
		function isMagVarUpdateBundle(url) {
			return BUILT_IN_TAVERN_SCRIPT_ORIGINS.includes(url.origin) && /^\/gh\/MagicalAstrogy\/MagVarUpdate(?:@[^/]+)?\/artifact\/bundle\.js$/iu.test(url.pathname);
		}
		async function remoteSource(url, signal) {
			const parsed = new URL(url);
			const cached = remoteCache.get(parsed.href);
			if (cached !== void 0) return cached;
			const response = await fetch(parsed.href, {
				cache: "force-cache",
				credentials: "omit",
				headers: { accept: "text/javascript, application/javascript, text/plain" },
				referrerPolicy: "no-referrer",
				signal
			});
			if (!response.ok) throw new Error(`远程脚本读取失败（${response.status}）`);
			if (response.url !== "" && new URL(response.url).origin !== parsed.origin) throw new Error("远程脚本不能重定向到另一个来源");
			const length = Number(response.headers.get("content-length") ?? 0);
			if (Number.isFinite(length) && length > MAX_REMOTE_SCRIPT_BYTES) throw new Error("远程脚本超过 2 MiB");
			const source = await response.text();
			if (new TextEncoder().encode(source).byteLength > MAX_REMOTE_SCRIPT_BYTES) throw new Error("远程脚本超过 2 MiB");
			remoteCache.set(parsed.href, source);
			if (remoteCache.size > MAX_REMOTE_CACHE_ENTRIES) remoteCache.delete(remoteCache.keys().next().value);
			return source;
		}
		function removeSourceRanges(source, ranges) {
			let result = source;
			for (const range of [...ranges].sort((left, right) => right.start - left.start)) result = `${result.slice(0, range.start)}${result.slice(range.end)}`;
			return result.trim();
		}
		/** Resolve and authorize one card script while preserving ESM module boundaries. */
		async function resolveTavernScriptExecution(content, signal, additionalOrigins = []) {
			const origins = approvedOrigins(additionalOrigins);
			const [imports] = parse(content);
			const urls = [];
			const adapterRanges = [];
			for (const imported of imports) {
				if (imported.d === -2) continue;
				if (imported.n === void 0) throw new Error("远程模块的动态 import 必须使用固定 HTTPS 地址");
				const url = approvedModuleUrl(imported.n, origins);
				if (isMagVarUpdateBundle(url)) {
					const statement = content.slice(imported.ss, imported.se);
					if (imported.d !== -1 || !/^\s*import\s*['"]/u.test(statement)) throw new Error("MagVarUpdate 宿主适配仅支持副作用导入");
					let end = imported.se;
					while (content[end] === " " || content[end] === "	") end += 1;
					if (content[end] === ";") end += 1;
					adapterRanges.push({
						start: imported.ss,
						end
					});
					continue;
				}
				urls.push(url);
			}
			const uniqueUrls = [...new Map(urls.map((url) => [url.href, url])).values()];
			const sources = await Promise.all(uniqueUrls.map((url) => remoteSource(url, signal)));
			if (sources.reduce((size, source) => size + new TextEncoder().encode(source).byteLength, 0) > MAX_REMOTE_SCRIPTS_BYTES) throw new Error("远程脚本合计超过 4 MiB");
			const source = removeSourceRanges(content, adapterRanges);
			const [, , , hasModuleSyntax] = parse(source);
			const dependencySource = [source, ...sources].join("\n");
			const preloads = [];
			if (/\bYAML\.(?:parse|parseDocument|stringify)\b/u.test(dependencySource)) preloads.push("yaml");
			if (/\bz\.(?:any|array|boolean|coerce|discriminatedUnion|enum|intersection|lazy|literal|nullable|number|object|optional|preprocess|record|string|tuple|union|unknown)\b/u.test(dependencySource)) preloads.push("zod");
			return {
				source,
				mode: hasModuleSyntax ? "module" : "classic",
				preloads,
				needsDomPurify: /\bDOMPurify\b/u.test(dependencySource),
				needsFuse: /\bFuse\b/u.test(dependencySource)
			};
		}
		function safeJson(value) {
			return JSON.stringify(value).replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
		}
		/** Browser-local storage key for SillyTavern-compatible extension settings. */
		const TAVERN_EXTENSION_SETTINGS_KEY = "dsh-agent-rp:tavern-extension-settings:v1";
		const MAX_TAVERN_EXTENSION_SETTINGS_BYTES = 2 * 1024 * 1024;
		function encodedTavernExtensionSettings(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("酒馆扩展设置必须是对象");
			let source;
			try {
				source = JSON.stringify(value);
			} catch {
				throw new Error("酒馆扩展设置必须可以保存为 JSON");
			}
			if (new TextEncoder().encode(source).byteLength > MAX_TAVERN_EXTENSION_SETTINGS_BYTES) throw new Error("酒馆扩展设置超过 2 MiB");
			const parsed = JSON.parse(source);
			if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("酒馆扩展设置必须是对象");
			return {
				source,
				value: parsed
			};
		}
		/** Read browser-persisted SillyTavern extension settings, recovering from an unavailable or corrupt store. */
		function readTavernExtensionSettings(storage) {
			try {
				const source = storage.getItem(TAVERN_EXTENSION_SETTINGS_KEY);
				return source === null ? {} : encodedTavernExtensionSettings(JSON.parse(source)).value;
			} catch {
				return {};
			}
		}
		/** Validate and persist one complete SillyTavern extension settings object. */
		function writeTavernExtensionSettings(storage, value) {
			const encoded = encodedTavernExtensionSettings(value);
			storage.setItem(TAVERN_EXTENSION_SETTINGS_KEY, encoded.source);
			return encoded.value;
		}
		function runtimeSource(snapshot) {
			return `
'use strict';
var __dshSnapshot=${safeJson(snapshot)};
var __dshScopes=__dshSnapshot.scopes;
var __dshMessages=__dshSnapshot.messages;
var __dshCharacterRegexScripts=__dshSnapshot.characterRegexScripts??[];
var __dshGlobalScriptTrees=__dshSnapshot.globalScriptTrees??[];
var __dshPresetScriptTrees=__dshSnapshot.presetScriptTrees??[];
var __dshCharacterScriptTrees=__dshSnapshot.characterScriptTrees??[];
var __dshInjectedPrompts=__dshSnapshot.injectedPrompts??[];
var __dshDisplayRegexScripts=__dshSnapshot.displayRegexScripts;
var __dshWorldbooks=__dshSnapshot.worldbooks;
var __dshWorldbookBindings=__dshSnapshot.worldbookBindings;
var __dshActiveWorldbookEntries=__dshSnapshot.activeWorldbookEntries;
var __dshPreset=__dshSnapshot.preset;
var __dshExtensionSettings=__dshClone(__dshSnapshot.extensionSettings??{});
var __dshMacroLikes=[];
function __dshScriptButtons(value){var result=[],seen=new Set();for(var button of Array.isArray(value)?value:[]){if(!button||typeof button!=='object')continue;var name=String(button.name??'').trim();if(!name||name.length>200||seen.has(name))continue;seen.add(name);result.push({name:name,visible:button.visible!==false});if(result.length>=50)break}return result}
var __dshCurrentScriptButtons=__dshScriptButtons(__dshScopes.script?.__dsh_script_buttons??__dshSnapshot.buttons);
var __dshCurrentScriptInfo=typeof __dshScopes.script?.__dsh_script_info==='string'?__dshScopes.script.__dsh_script_info:__dshSnapshot.scriptInfo;
var __dshListeners=new Map();
var __dshPending=new Map();
var __dshRequest=0;
function __dshClone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value))}
function __dshPath(path){if(Array.isArray(path))return path.map(String);return String(path??'').replace(/\\[([^[\\]]+)\\]/g,'.$1').replace(/^\\./,'').split('.').filter(Boolean)}
function __dshGet(object,path,fallback){var value=object;for(var part of __dshPath(path)){if(value==null)return fallback;value=value[part]}return value===undefined?fallback:value}
function __dshSet(object,path,value){var parts=__dshPath(path);if(parts.length===0)return object;var target=object;for(var i=0;i<parts.length-1;i++){var key=parts[i];var next=parts[i+1];if(target[key]===null||typeof target[key]!=='object')target[key]=/^\\d+$/.test(next)?[]:{};target=target[key]}target[parts.at(-1)]=value;return object}
function __dshUnset(object,path){var parts=__dshPath(path);var target=object;for(var i=0;i<parts.length-1;i++){target=target?.[parts[i]];if(target==null)return false}return target!=null&&delete target[parts.at(-1)]}
function __dshPlain(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)}
function __dshMerge(target){for(var source of Array.prototype.slice.call(arguments,1)){if(!__dshPlain(source))continue;for(var key of Object.keys(source)){var value=source[key];if(__dshPlain(value)){if(!__dshPlain(target[key]))target[key]={};__dshMerge(target[key],value)}else target[key]=__dshClone(value)}}return target}
function __dshScope(option){var type=option?.type??'chat';if(type==='script')return 'script';if(type==='message')return 'message';return ['global','preset','character','chat'].includes(type)?type:'chat'}
function __dshPost(action,data){parent.postMessage(Object.assign({source:'dsh-agent-rp-tavern-script',scriptId:__dshSnapshot.scriptId,action:action},data??{}),'*')}
function __dshReplace(variables,option){var scope=__dshScope(option);var cloned=__dshClone(variables??{});__dshScopes[scope]=cloned;if(scope==='script')__dshSyncScriptTreeData(__dshSnapshot.scriptId,cloned);var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('variables-replace',{requestId:requestId,scope:scope,variables:cloned})})}
function __dshWorldbookMutation(request){var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('worldbook-mutate',{requestId:requestId,request:__dshClone(request)})})}
function __dshChatMutation(request){var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('chat-mutate',{requestId:requestId,request:__dshClone(request)})})}
function __dshPresetMutation(value){var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject,preset:value});__dshPost('preset-replace',{requestId:requestId,preset:__dshClone(value)})})}
function __dshInjectionMutation(prompts){var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('injections-replace',{requestId:requestId,prompts:__dshClone(prompts)})})}
var __dshSettingsTimer;
function __dshSaveSettingsDebounced(){clearTimeout(__dshSettingsTimer);__dshSettingsTimer=setTimeout(function(){__dshSettingsTimer=undefined;__dshPost('extension-settings-save',{settings:__dshClone(__dshExtensionSettings)})},300)}
function __dshSaveSettings(){clearTimeout(__dshSettingsTimer);__dshSettingsTimer=undefined;var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('extension-settings-save',{requestId:requestId,settings:__dshClone(__dshExtensionSettings)})})}
function __dshStorageRequest(namespace,operation,key,value,index){var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('storage-request',{requestId:requestId,namespace:namespace,operation:operation,...(key===undefined?{}:{key:String(key)}),...(value===undefined?{}:{value:value}),...(index===undefined?{}:{index:index})})})}
function __dshLocalForage(namespace){var storage={getItem:function(key){return __dshStorageRequest(namespace,'get',key)},setItem:function(key,value){return __dshStorageRequest(namespace,'set',key,value===undefined?null:value)},removeItem:function(key){return __dshStorageRequest(namespace,'remove',key)},clear:function(){return __dshStorageRequest(namespace,'clear')},keys:function(){return __dshStorageRequest(namespace,'keys')},length:function(){return __dshStorageRequest(namespace,'length')},key:function(index){return __dshStorageRequest(namespace,'key',undefined,undefined,index)}};storage.iterate=function(iteratee){return storage.keys().then(async function(keys){var iteration=1;for(var key of keys){var value=await storage.getItem(key);var result=await iteratee(value,key,iteration++);if(result!==undefined)return result}})};return storage}
var __dshLocalForageRoot=__dshLocalForage('localforage\u0000keyvaluepairs');
__dshLocalForageRoot.createInstance=function(option){option=__dshPlain(option)?option:{};var name=String(option.name??'localforage'),store=String(option.storeName??'keyvaluepairs');if(!name||!store)throw new Error('酒馆脚本存储实例名称不能为空');return __dshLocalForage(name+'\u0000'+store)};
var __dshScriptMetadataScheduled=false;
function __dshPersistScriptMetadata(){if(__dshScriptMetadataScheduled)return;__dshScriptMetadataScheduled=true;queueMicrotask(function(){__dshScriptMetadataScheduled=false;var variables=__dshClone(__dshScopes.script??{});variables.__dsh_script_buttons=__dshClone(__dshCurrentScriptButtons);variables.__dsh_script_info=__dshCurrentScriptInfo;void __dshReplace(variables,{type:'script'}).catch(function(error){__dshPost('runtime-error',{value:String(error)})})})}
function __dshReportScriptButtons(){__dshPost('script-buttons',{buttons:__dshClone(__dshCurrentScriptButtons)})}
function __dshWorldbookName(value){var name=String(value??'').trim();if(!name)throw new Error('世界书名称不能为空');return name}
function __dshWorldbookEntries(entries){entries=Array.isArray(entries)?entries:[];var used=new Set();return entries.map(function(value,index){var entry=value&&typeof value==='object'?value:{};var uid=Number.isSafeInteger(entry.uid)&&entry.uid>=0&&entry.uid<1000000?entry.uid:index%1000000;while(used.has(uid))uid=(uid+1)%1000000;used.add(uid);var strategy=entry.strategy&&typeof entry.strategy==='object'?entry.strategy:{};var secondary=strategy.keys_secondary&&typeof strategy.keys_secondary==='object'?strategy.keys_secondary:{};var position=entry.position&&typeof entry.position==='object'?entry.position:{};var recursion=entry.recursion&&typeof entry.recursion==='object'?entry.recursion:{};var effect=entry.effect&&typeof entry.effect==='object'?entry.effect:{};var key=function(item){return item instanceof RegExp?item.toString():String(item)};return {uid:uid,name:String(entry.name??''),enabled:entry.enabled!==false,strategy:{type:['constant','selective','vectorized'].includes(strategy.type)?strategy.type:'constant',keys:Array.isArray(strategy.keys)?strategy.keys.map(key):[],keys_secondary:{logic:['and_any','and_all','not_all','not_any'].includes(secondary.logic)?secondary.logic:'and_any',keys:Array.isArray(secondary.keys)?secondary.keys.map(key):[]},scan_depth:strategy.scan_depth==='same_as_global'?'same_as_global':Number.isFinite(strategy.scan_depth)?Math.max(0,strategy.scan_depth):'same_as_global'},position:{type:['before_character_definition','after_character_definition','before_example_messages','after_example_messages','before_author_note','after_author_note','at_depth','outlet'].includes(position.type)?position.type:'at_depth',role:['system','assistant','user'].includes(position.role)?position.role:'system',depth:Number.isFinite(position.depth)?position.depth:4,order:Number.isFinite(position.order)?position.order:100},content:String(entry.content??''),probability:Number.isFinite(entry.probability)?Math.min(100,Math.max(0,entry.probability)):100,recursion:{prevent_incoming:recursion.prevent_incoming===true,prevent_outgoing:recursion.prevent_outgoing===true,delay_until:Number.isFinite(recursion.delay_until)&&recursion.delay_until>0?recursion.delay_until:null},effect:{sticky:Number.isFinite(effect.sticky)&&effect.sticky>0?effect.sticky:null,cooldown:Number.isFinite(effect.cooldown)&&effect.cooldown>0?effect.cooldown:null,delay:Number.isFinite(effect.delay)&&effect.delay>0?effect.delay:null},...(entry.extra&&typeof entry.extra==='object'?{extra:__dshClone(entry.extra)}:{}),...(entry.ignoreBudget===true?{ignoreBudget:true}:{})}})}
window.getWorldbookNames=function(){return Object.keys(__dshWorldbooks)};
window.getGlobalWorldbookNames=function(){return __dshClone(__dshWorldbookBindings.global)};
window.rebindGlobalWorldbooks=function(names){names=Array.from(new Set((Array.isArray(names)?names:[]).map(__dshWorldbookName)));return __dshWorldbookMutation({format:0,operation:'bind-global-worldbooks',names:names}).then(function(){__dshWorldbookBindings.global=names})};
window.getCharWorldbookNames=function(name){if(name!=='current')throw new Error('当前仅支持查询当前角色卡');return __dshClone(__dshWorldbookBindings.character)};
window.rebindCharWorldbooks=function(name,bindings){if(name!=='current')return Promise.reject(new Error('当前仅支持绑定当前角色卡'));bindings=bindings??{};var primary=bindings.primary==null?null:__dshWorldbookName(bindings.primary);var additional=Array.from(new Set((Array.isArray(bindings.additional)?bindings.additional:[]).map(__dshWorldbookName)));return __dshWorldbookMutation({format:0,operation:'bind-character-worldbooks',primary:primary,additional:additional}).then(function(){__dshWorldbookBindings.character={primary:primary,additional:additional}})};
window.getChatWorldbookName=function(name){if(name!=='current')throw new Error('当前仅支持查询当前聊天');return __dshWorldbookBindings.chat};
window.rebindChatWorldbook=function(name,worldbook){if(name!=='current')return Promise.reject(new Error('当前仅支持绑定当前聊天'));var value=worldbook==null?null:__dshWorldbookName(worldbook);return __dshWorldbookMutation({format:0,operation:'bind-chat-worldbook',name:value}).then(function(){__dshWorldbookBindings.chat=value})};
window.getWorldbook=function(name){name=__dshWorldbookName(name);if(!Object.hasOwn(__dshWorldbooks,name))return Promise.reject(new Error("未能找到世界书 '"+name+"'"));return Promise.resolve(__dshClone(__dshWorldbooks[name]))};
function __dshLegacyWorldbookEntry(entry,index){var type=entry.strategy?.type??'constant';var position=entry.position?.type??'at_depth';var atDepth=position==='at_depth'||position==='outlet';var extra=__dshPlain(entry.extra)?entry.extra:{};var keys=__dshClone(entry.strategy?.keys??[]),filters=__dshClone(entry.strategy?.keys_secondary?.keys??[]);return Object.assign({},__dshClone(extra),{uid:entry.uid,display_index:index,comment:entry.name??'',enabled:entry.enabled!==false,type:type,position:atDepth?'at_depth_as_'+(entry.position?.role??'system'):position,depth:atDepth?(entry.position?.depth??4):null,order:entry.position?.order??100,probability:entry.probability??100,keys:keys,key:__dshClone(keys),logic:entry.strategy?.keys_secondary?.logic??'and_any',filters:filters,filter:__dshClone(filters),scan_depth:entry.strategy?.scan_depth??'same_as_global',case_sensitive:extra.case_sensitive??'same_as_global',match_whole_words:extra.match_whole_words??'same_as_global',use_group_scoring:extra.use_group_scoring??'same_as_global',automation_id:extra.automation_id??null,exclude_recursion:entry.recursion?.prevent_incoming===true,prevent_recursion:entry.recursion?.prevent_outgoing===true,delay_until_recursion:entry.recursion?.delay_until??false,content:entry.content??'',group:extra.group??'',group_prioritized:extra.group_prioritized===true,group_weight:extra.group_weight??100,sticky:entry.effect?.sticky??null,cooldown:entry.effect?.cooldown??null,delay:entry.effect?.delay??null,constant:type==='constant',disable:entry.enabled===false})}
function __dshWorldbookFromLegacy(value){var entry=__dshPlain(value)?value:{};var position=typeof entry.position==='string'?entry.position:'before_character_definition';var atDepthRoles={at_depth_as_system:'system',at_depth_as_assistant:'assistant',at_depth_as_user:'user'};var atDepth=Object.hasOwn(atDepthRoles,position);var ordinaryPositions=['before_character_definition','after_character_definition','before_example_messages','after_example_messages','before_author_note','after_author_note'];var keys=Array.isArray(entry.keys)?entry.keys:Array.isArray(entry.key)?entry.key:[];var filters=Array.isArray(entry.filters)?entry.filters:Array.isArray(entry.filter)?entry.filter:[];var type=['constant','selective','vectorized'].includes(entry.type)?entry.type:'selective';var extra={case_sensitive:typeof entry.case_sensitive==='boolean'?entry.case_sensitive:'same_as_global',match_whole_words:typeof entry.match_whole_words==='boolean'?entry.match_whole_words:'same_as_global',use_group_scoring:typeof entry.use_group_scoring==='boolean'?entry.use_group_scoring:'same_as_global',automation_id:typeof entry.automation_id==='string'?entry.automation_id:null,group:String(entry.group??''),group_prioritized:entry.group_prioritized===true,group_weight:Number.isFinite(entry.group_weight)?entry.group_weight:100};return {...(Number.isSafeInteger(entry.uid)&&entry.uid>=0&&entry.uid<1000000?{uid:entry.uid}:{}),name:String(entry.comment??''),enabled:entry.enabled!==false,strategy:{type:type,keys:keys,keys_secondary:{logic:['and_any','and_all','not_all','not_any'].includes(entry.logic)?entry.logic:'and_any',keys:filters},scan_depth:entry.scan_depth==='same_as_global'?'same_as_global':Number.isFinite(entry.scan_depth)?entry.scan_depth:'same_as_global'},position:{type:atDepth?'at_depth':ordinaryPositions.includes(position)?position:'before_character_definition',role:atDepth?atDepthRoles[position]:'system',depth:Number.isFinite(entry.depth)?entry.depth:4,order:Number.isFinite(entry.order)?entry.order:100},content:String(entry.content??''),probability:Number.isFinite(entry.probability)?entry.probability:100,recursion:{prevent_incoming:entry.exclude_recursion===true,prevent_outgoing:entry.prevent_recursion===true,delay_until:Number.isFinite(entry.delay_until_recursion)&&entry.delay_until_recursion>0?entry.delay_until_recursion:null},effect:{sticky:Number.isFinite(entry.sticky)&&entry.sticky>0?entry.sticky:null,cooldown:Number.isFinite(entry.cooldown)&&entry.cooldown>0?entry.cooldown:null,delay:Number.isFinite(entry.delay)&&entry.delay>0?entry.delay:null},extra:extra}}
function __dshWorldbookFromLegacyEntries(entries){return (Array.isArray(entries)?entries:[]).map(__dshWorldbookFromLegacy)}
function __dshLorebookFilter(entry,filter){return Object.entries(filter).every(function(pair){var actual=entry[pair[0]],expected=pair[1];if(Array.isArray(actual))return Array.isArray(expected)&&expected.every(function(value){return actual.includes(value)});if(typeof actual==='string')return typeof expected==='string'&&actual.includes(expected);return actual===expected})}
window.getLorebookEntries=function(name,option){var filter=option?.filter??'none';if(filter!=='none'&&!__dshPlain(filter))return Promise.reject(new Error("世界书条目筛选必须是对象或 'none'"));return window.getWorldbook(name).then(function(entries){var result=entries.map(__dshLegacyWorldbookEntry);return filter==='none'?result:result.filter(function(entry){return __dshLorebookFilter(entry,filter)})})};
window.replaceLorebookEntries=function(name,entries){return window.replaceWorldbook(name,__dshWorldbookFromLegacyEntries(entries))};
window.updateLorebookEntriesWith=function(name,updater){return window.getLorebookEntries(name).then(updater).then(function(entries){return window.replaceLorebookEntries(name,entries)}).then(function(){return window.getLorebookEntries(name)})};
window.setLorebookEntries=function(name,entries){var patches=Array.isArray(entries)?entries:[];return window.updateLorebookEntriesWith(name,function(current){for(var patch of patches){if(!__dshPlain(patch)||!Number.isSafeInteger(patch.uid))continue;var target=current.find(function(entry){return entry.uid===patch.uid});if(target)__dshMerge(target,patch)}return current})};
window.createLorebookEntries=function(name,entries){var newUids=[];return window.updateLorebookEntriesWith(name,function(current){var used=new Set(current.map(function(entry){return entry.uid}));var added=(Array.isArray(entries)?entries:[]).map(function(entry){var uid=0;while(uid<1000000&&used.has(uid))uid++;if(uid===1000000)throw new Error('无法找到可用的世界书条目 uid');used.add(uid);newUids.push(uid);return Object.assign({},__dshPlain(entry)?__dshClone(entry):{},{uid:uid})});return current.concat(added)}).then(function(entries){return {entries:entries,new_uids:newUids}})};
window.deleteLorebookEntries=function(name,uids){var targets=new Set((Array.isArray(uids)?uids:[]).filter(Number.isSafeInteger));var occurred=false;return window.updateLorebookEntriesWith(name,function(current){var next=current.filter(function(entry){if(targets.has(entry.uid)){occurred=true;return false}return true});return next}).then(function(entries){return {entries:entries,delete_occurred:occurred}})};
window.createLorebookEntry=function(name,entry){return window.createLorebookEntries(name,[entry]).then(function(result){return result.new_uids[0]})};
window.deleteLorebookEntry=function(name,uid){return window.deleteLorebookEntries(name,[uid]).then(function(result){return result.delete_occurred})};
window.createWorldbook=function(name,entries){name=__dshWorldbookName(name);if(Object.hasOwn(__dshWorldbooks,name))return Promise.resolve(false);var next=__dshWorldbookEntries(entries);return __dshWorldbookMutation({format:0,operation:'replace-worldbook',name:name,entries:next}).then(function(){__dshWorldbooks[name]=next;return true})};
window.createOrReplaceWorldbook=function(name,entries){name=__dshWorldbookName(name);var created=!Object.hasOwn(__dshWorldbooks,name);var next=__dshWorldbookEntries(entries);return __dshWorldbookMutation({format:0,operation:'replace-worldbook',name:name,entries:next}).then(function(){__dshWorldbooks[name]=next;return created})};
window.replaceWorldbook=function(name,entries){name=__dshWorldbookName(name);if(!Object.hasOwn(__dshWorldbooks,name))return Promise.reject(new Error("未能找到世界书 '"+name+"'"));var next=__dshWorldbookEntries(entries);return __dshWorldbookMutation({format:0,operation:'replace-worldbook',name:name,entries:next}).then(function(){__dshWorldbooks[name]=next})};
window.deleteWorldbook=function(name){name=__dshWorldbookName(name);if(!Object.hasOwn(__dshWorldbooks,name))return Promise.resolve(false);return __dshWorldbookMutation({format:0,operation:'delete-worldbook',name:name}).then(function(){delete __dshWorldbooks[name];return true})};
window.updateWorldbookWith=function(name,updater){return window.getWorldbook(name).then(updater).then(function(entries){return window.replaceWorldbook(name,entries)}).then(function(){return window.getWorldbook(name)})};
window.createWorldbookEntries=function(name,entries){var start=0;return window.updateWorldbookWith(name,function(current){start=current.length;return current.concat(Array.isArray(entries)?entries:[])}).then(function(worldbook){return {worldbook:worldbook,new_entries:worldbook.slice(start)}})};
window.deleteWorldbookEntries=function(name,predicate){var removed=[];return window.updateWorldbookWith(name,function(current){return current.filter(function(entry){if(predicate(entry)){removed.push(entry);return false}return true})}).then(function(worldbook){return {worldbook:worldbook,deleted_entries:removed}})};
window.getOrCreateChatWorldbook=function(chatName,worldbookName){if(chatName!=='current')return Promise.reject(new Error('当前仅支持当前聊天'));if(__dshWorldbookBindings.chat&&Object.hasOwn(__dshWorldbooks,__dshWorldbookBindings.chat))return Promise.resolve(__dshWorldbookBindings.chat);var name=worldbookName?__dshWorldbookName(worldbookName):'聊天世界书-'+Date.now();return window.createWorldbook(name).then(function(){return window.rebindChatWorldbook('current',name)}).then(function(){return name})};
window.getLorebooks=window.getWorldbookNames;window.deleteLorebook=window.deleteWorldbook;window.createLorebook=window.createWorldbook;window.getCharLorebooks=function(){return window.getCharWorldbookNames('current')};window.getCurrentCharPrimaryLorebook=function(){return window.getCharWorldbookNames('current').primary};window.setCurrentCharLorebooks=function(value){return window.rebindCharWorldbooks('current',{...window.getCharWorldbookNames('current'),...value})};window.getChatLorebook=function(){return window.getChatWorldbookName('current')};window.setChatLorebook=function(value){return window.rebindChatWorldbook('current',value)};window.getOrCreateChatLorebook=function(name){return window.getOrCreateChatWorldbook('current',name)};
function __DshStorage(initial,persist){this.data=new Map(Object.entries(initial??{}).map(function(pair){return [String(pair[0]),String(pair[1])]}));this.persist=persist}
Object.defineProperty(__DshStorage.prototype,'length',{get:function(){return this.data.size}});
__DshStorage.prototype.key=function(index){return Array.from(this.data.keys())[Number(index)]??null};
__DshStorage.prototype.getItem=function(key){key=String(key);return this.data.has(key)?this.data.get(key):null};
__DshStorage.prototype.setItem=function(key,value){this.data.set(String(key),String(value));this.persist?.(this.data)};
__DshStorage.prototype.removeItem=function(key){this.data.delete(String(key));this.persist?.(this.data)};
__DshStorage.prototype.clear=function(){this.data.clear();this.persist?.(this.data)};
var __dshStorageScheduled=false;
var __dshLocalStorage=new __DshStorage(__dshScopes.script?.__dsh_local_storage,function(data){if(__dshStorageScheduled)return;__dshStorageScheduled=true;queueMicrotask(function(){__dshStorageScheduled=false;var variables=__dshClone(__dshScopes.script??{});variables.__dsh_local_storage=Object.fromEntries(data);void __dshReplace(variables,{type:'script'}).catch(function(error){__dshPost('runtime-error',{value:String(error)})})})});
var __dshSessionStorage=new __DshStorage();
try{Object.defineProperty(window,'localStorage',{configurable:true,value:__dshLocalStorage})}catch(error){}
try{Object.defineProperty(window,'sessionStorage',{configurable:true,value:__dshSessionStorage})}catch(error){}
window.getVariables=function(option){return __dshClone(__dshScopes[__dshScope(option)]??{})};
window.replaceVariables=__dshReplace;
window.updateVariablesWith=function(updater,option){var current=window.getVariables(option);return Promise.resolve(updater(current)).then(function(next){return __dshReplace(next,option).then(function(){return next})})};
window.insertOrAssignVariables=function(variables,option){return window.updateVariablesWith(function(current){return __dshMerge(current,variables)},option)};
window.insertVariables=function(variables,option){return window.updateVariablesWith(function(current){return __dshMerge({},variables,current)},option)};
window.deleteVariable=function(path,option){var occurred=false;return window.updateVariablesWith(function(current){occurred=__dshUnset(current,path);return current},option).then(function(variables){return {variables:variables,delete_occurred:occurred}})};
window.getAllVariables=function(){return __dshClone(__dshMerge({},__dshScopes.global,__dshScopes.character,__dshScopes.script,__dshScopes.chat,__dshScopes.message))};
var __dshInjectionWrite=Promise.resolve(),__dshInjectionRefresh=0;
var __dshInjectionDefinitions=new Map(__dshInjectedPrompts.map(function(prompt){return [prompt.id,{prompt:prompt}]}));
function __dshPersistInjections(){var prompts=__dshClone(__dshInjectedPrompts);var write=__dshInjectionMutation(prompts).catch(function(error){__dshPost('runtime-error',{value:String(error)})});__dshInjectionWrite=Promise.all([__dshInjectionWrite,write]).then(function(){});return write}
function __dshInjectedPrompt(value,index,once){if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('注入提示词 '+index+' 必须是对象');var id=String(value.id??'').trim();if(!id||id.length>512)throw new Error('注入提示词 '+index+' 的 id 无效');if(!['in_chat','none'].includes(value.position))throw new Error('注入提示词 '+id+' 的 position 无效');if(!['system','assistant','user'].includes(value.role))throw new Error('注入提示词 '+id+' 的 role 无效');if(value.should_scan!==undefined&&typeof value.should_scan!=='boolean')throw new Error('注入提示词 '+id+' 的 should_scan 无效');var depth=Number(value.depth);if(!Number.isSafeInteger(depth)||depth<0||depth>20000)throw new Error('注入提示词 '+id+' 的 depth 无效');var content=String(value.content??'');if(content.length>262144)throw new Error('注入提示词 '+id+' 过长');return {id:id,position:value.position,depth:depth,role:value.role,content:content,shouldScan:value.should_scan===true,once:once}}
function __dshApplyInjectionFilters(version,definitions,enabled){if(version!==__dshInjectionRefresh)return;var prompts=definitions.flatMap(function(definition,index){return enabled[index]?[definition.prompt]:[]});if(JSON.stringify(prompts)===JSON.stringify(__dshInjectedPrompts))return;__dshInjectedPrompts=prompts;return __dshPersistInjections()}
function __dshRefreshInjections(){var version=++__dshInjectionRefresh,definitions=Array.from(__dshInjectionDefinitions.values()),enabled=definitions.map(function(definition){if(typeof definition.filter!=='function')return true;try{return definition.filter()}catch(error){__dshPost('runtime-error',{value:String(error)});return false}});var async=enabled.some(function(value){return value&&typeof value.then==='function'});var task=async?Promise.all(enabled.map(function(value){return Promise.resolve(value).catch(function(error){__dshPost('runtime-error',{value:String(error)});return false})})).then(function(values){return __dshApplyInjectionFilters(version,definitions,values)}):Promise.resolve(__dshApplyInjectionFilters(version,definitions,enabled));return task.then(function(){})}
window.injectPrompts=function(prompts,option){if(!Array.isArray(prompts)||prompts.length>256)throw new Error('注入提示词列表无效');if(option?.once!==undefined&&typeof option.once!=='boolean')throw new Error('注入提示词 once 无效');var prepared=prompts.map(function(source,index){return {source:source,prompt:__dshInjectedPrompt(source,index,option?.once===true)}});if(prepared.reduce(function(total,item){return total+item.prompt.content.length},0)>1048576)throw new Error('注入提示词合计过长');var ids=prepared.map(function(item){return item.prompt.id});for(var item of prepared)__dshInjectionDefinitions.set(item.prompt.id,{prompt:item.prompt,filter:item.source.filter});void __dshRefreshInjections();return {uninject:function(){window.uninjectPrompts(ids)}}};
window.uninjectPrompts=function(ids){var targets=new Set((Array.isArray(ids)?ids:[]).map(String));if(targets.size===0)return;for(var id of targets)__dshInjectionDefinitions.delete(id);__dshInjectionRefresh++;var next=__dshInjectedPrompts.filter(function(prompt){return !targets.has(prompt.id)});if(next.length===__dshInjectedPrompts.length)return;__dshInjectedPrompts=next;__dshPersistInjections()};
function __dshConsumeOnceInjections(){var ids=new Set(__dshInjectedPrompts.filter(function(prompt){return prompt.once===true}).map(function(prompt){return prompt.id}));if(ids.size===0)return;for(var id of ids)__dshInjectionDefinitions.delete(id);__dshInjectionRefresh++;__dshInjectedPrompts=__dshInjectedPrompts.filter(function(prompt){return !ids.has(prompt.id)});__dshPersistInjections()}
window.waitGlobalInitialized=function(name){return Promise.resolve(window[name])};
window.getScriptId=function(){return __dshSnapshot.scriptId};
window.getScriptName=function(){return __dshSnapshot.scriptName};
window.getScriptInfo=function(){return __dshCurrentScriptInfo};
window.replaceScriptInfo=function(info){__dshCurrentScriptInfo=String(info??'').slice(0,8000);__dshPersistScriptMetadata()};
window.getScriptButtons=function(){return __dshClone(__dshCurrentScriptButtons)};
window.replaceScriptButtons=function(buttons){__dshCurrentScriptButtons=__dshScriptButtons(buttons);__dshReportScriptButtons();__dshPersistScriptMetadata()};
window.updateScriptButtonsWith=function(updater){var next=updater(window.getScriptButtons());if(next&&typeof next.then==='function')return next.then(function(value){window.replaceScriptButtons(value);return window.getScriptButtons()});window.replaceScriptButtons(next);return window.getScriptButtons()};
window.getCurrentCharId=function(){return __dshSnapshot.characterId};
window.getCurrentCharacterId=window.getCurrentCharId;
window.getCurrentCharacterName=function(){return __dshSnapshot.characterName};
window.getCurrentChatId=function(){return __dshSnapshot.chatId};
window.getCurrentPersonaName=function(){return __dshSnapshot.persona?.name??null};
window.getCurrentPersonaId=function(){return __dshSnapshot.persona?.id??null};
function __dshPresetName(name){if(name!=='in_use')throw new Error("当前仅支持正在使用的预设 'in_use'");if(!__dshPreset)throw new Error('当前会话没有预设');return name}
window.getPresetNames=function(){return __dshPreset?['in_use']:[]};
window.getLoadedPresetName=function(){return __dshPreset?.name??''};
window.getPreset=function(name){__dshPresetName(name);return __dshClone(__dshPreset.value)};
window.replacePreset=function(name,value){__dshPresetName(name);if(!__dshPlain(value))return Promise.reject(new Error('预设必须是对象'));var next=__dshClone(value);return __dshPresetMutation(next).then(function(){__dshPreset={name:__dshPreset.name,revision:__dshPreset.revision+1,value:next}})};
window.updatePresetWith=function(name,updater,option){var current=window.getPreset(name);return Promise.resolve(updater(current)).then(function(next){return window.replacePreset(name,next,option).then(function(){return window.getPreset(name)})})};
window.setPreset=function(name,value,option){if(value!==undefined&&!__dshPlain(value))return Promise.reject(new Error('预设修改必须是对象'));return window.updatePresetWith(name,function(current){return __dshMerge({},current,value??{})},option)};
window.isPresetSystemPrompt=function(prompt){return ['main','nsfw','jailbreak','enhanceDefinitions'].includes(String(prompt?.id??''))};
window.isPresetPlaceholderPrompt=function(prompt){return ['worldInfoBefore','personaDescription','charDescription','charPersonality','scenario','worldInfoAfter','dialogueExamples','chatHistory'].includes(String(prompt?.id??''))};
window.isPresetNormalPrompt=function(prompt){return !window.isPresetSystemPrompt(prompt)&&!window.isPresetPlaceholderPrompt(prompt)};
function __dshPresetRegexOption(option){if(!__dshPlain(option)||option.type!=='preset'||(option.name!==undefined&&option.name!=='in_use'))throw new Error("当前仅支持写入正在使用的预设正则 { type: 'preset', name: 'in_use' }");__dshPresetName('in_use')}
function __dshPresetRegexes(){var extensions=__dshPreset?.value?.extensions;return Array.isArray(extensions?.regex_scripts)?extensions.regex_scripts:[]}
function __dshCharacterRegexOption(option){var name=option?.name;if(name!==undefined&&name!=='current'&&name!==__dshSnapshot.characterName)throw new Error('当前仅支持查询当前角色卡正则');return __dshCharacterRegexScripts}
function __dshLegacyRegexes(option){option=option??{};var scope=option.scope??'all',enableState=option.enable_state??'all';if(!['all','global','character'].includes(scope))throw new Error("提供的 scope 无效, 请提供 'all', 'global' 或 'character'");if(!['all','enabled','disabled'].includes(enableState))throw new Error("提供的 enable_state 无效, 请提供 'all', 'enabled' 或 'disabled'");var regexes=[];if(scope==='all'||scope==='character')regexes=regexes.concat(__dshCharacterRegexOption({type:'character'}).map(function(regex){return Object.assign({},regex,{scope:'character'})}));return enableState==='all'?regexes:regexes.filter(function(regex){return regex.enabled===(enableState==='enabled')})}
window.isCharacterTavernRegexesEnabled=function(){return __dshCharacterRegexScripts.length>0};
window.getTavernRegexes=function(option){if(option?.type===undefined)return __dshClone(__dshLegacyRegexes(option));if(option.type==='preset'){__dshPresetRegexOption(option);return __dshClone(__dshPresetRegexes())}if(option.type==='character')return __dshClone(__dshCharacterRegexOption(option));if(option.type==='global')return [];throw new Error('不支持的酒馆正则类型: '+String(option.type))};
window.replaceTavernRegexes=function(regexes,option){try{__dshPresetRegexOption(option);if(!Array.isArray(regexes))throw new Error('预设正则必须是数组');var replacement=__dshClone(regexes);for(var index=0;index<replacement.length;index++)if(replacement[index]?.script_name==='')replacement[index].script_name='未命名-'+String(replacement[index]?.id??index+1);var next=__dshClone(__dshPreset.value);if(!__dshPlain(next.extensions))next.extensions={};next.extensions.regex_scripts=replacement;return __dshPresetMutation(next).then(function(){__dshPreset={name:__dshPreset.name,revision:__dshPreset.revision+1,value:next};return window.eventEmit(window.tavern_events.CHAT_CHANGED,__dshSnapshot.chatId)})}catch(error){return Promise.reject(error)}};
window.updateTavernRegexesWith=function(updater,option){var current=window.getTavernRegexes(option);return Promise.resolve(updater(current)).then(function(next){return window.replaceTavernRegexes(next,option).then(function(){return window.getTavernRegexes(option)})})};
var __dshScriptTreeId=0;
function __dshNormalizeScript(value,seen){var script=__dshPlain(value)?value:{};var id=String(script.id??'').trim()||'dsh-script-'+Date.now()+'-'+(++__dshScriptTreeId);var original=id,suffix=1;while(seen.has(id))id=original+'-'+(++suffix);seen.add(id);var button=__dshPlain(script.button)?script.button:{};var exported=__dshPlain(script.export_with)?script.export_with:{};return {type:'script',enabled:script.enabled===true,name:String(script.name??''),id:id,content:String(script.content??''),info:String(script.info??''),button:{enabled:button.enabled!==false,buttons:__dshScriptButtons(button.buttons)},data:__dshPlain(script.data)?__dshClone(script.data):{},export_with:{data:exported.data!==false,button:exported.button!==false}}}
function __dshNormalizeScriptTrees(value){if(!Array.isArray(value))throw new Error('脚本树必须是数组');var trees=value,seen=new Set(),count=0;if(trees.length>512)throw new Error('脚本树数量超过限制');return trees.map(function(value){var tree=__dshPlain(value)?value:{};count++;if(tree.type!=='folder')return __dshNormalizeScript(tree,seen);var id=String(tree.id??'').trim()||'dsh-folder-'+Date.now()+'-'+(++__dshScriptTreeId);var original=id,suffix=1;while(seen.has(id))id=original+'-'+(++suffix);seen.add(id);var children=Array.isArray(tree.scripts)?tree.scripts:[];count+=children.length;if(count>512)throw new Error('脚本树数量超过限制');return {type:'folder',enabled:tree.enabled===true,name:String(tree.name??''),id:id,icon:String(tree.icon??'fa-solid fa-folder'),color:String(tree.color??''),scripts:children.map(function(script){return __dshNormalizeScript(script,seen)})}})}
function __dshScriptTreeScope(option){if(!__dshPlain(option)||!['global','preset','character'].includes(option.type))throw new Error("脚本类型必须是 'global'、'preset' 或 'character'");return option.type}
function __dshSetScriptTrees(scope,trees){if(scope==='global')__dshGlobalScriptTrees=trees;else if(scope==='preset')__dshPresetScriptTrees=trees;else __dshCharacterScriptTrees=trees}
function __dshSyncScriptTreeData(id,data){for(var tree of __dshGlobalScriptTrees.concat(__dshPresetScriptTrees,__dshCharacterScriptTrees)){var scripts=tree?.type==='folder'?tree.scripts:[tree];for(var script of Array.isArray(scripts)?scripts:[])if(script?.id===id)script.data=__dshClone(data)}}
window.getScriptTrees=function(option){var scope=__dshScriptTreeScope(option);return __dshClone(scope==='global'?__dshGlobalScriptTrees:scope==='preset'?__dshPresetScriptTrees:__dshCharacterScriptTrees)};
window.replaceScriptTrees=function(trees,option){var scope=__dshScriptTreeScope(option),next=__dshNormalizeScriptTrees(trees);__dshSetScriptTrees(scope,next);void __dshWorldbookMutation({format:0,operation:'replace-script-trees',scope:scope,trees:next}).catch(function(error){__dshPost('runtime-error',{value:String(error)})})};
window.updateScriptTreesWith=function(updater,option){var current=window.getScriptTrees(option),next=updater(current);if(next&&typeof next.then==='function')return next.then(function(value){window.replaceScriptTrees(value,option);return window.getScriptTrees(option)});window.replaceScriptTrees(next,option);return window.getScriptTrees(option)};
function __dshEnabledScripts(trees){return trees.flatMap(function(tree){if(tree?.type==='folder')return tree.enabled===false?[]:(Array.isArray(tree.scripts)?tree.scripts:[]).filter(function(script){return script?.enabled!==false});return tree?.enabled===false?[]:[tree]})}
window.getAllEnabledScriptButtons=function(){var result={};for(var tree of __dshEnabledScripts(__dshGlobalScriptTrees.concat(__dshPresetScriptTrees,__dshCharacterScriptTrees))){if(tree?.type!=='script'||tree.button?.enabled!==true)continue;var buttons=(Array.isArray(tree.button.buttons)?tree.button.buttons:[]).filter(function(button){return button?.visible!==false}).map(function(button){return {button_id:String(tree.id)+'_'+String(button.name),button_name:String(button.name)}});if(buttons.length>0)result[String(tree.id)]=buttons}return __dshClone(result)};
window.appendInexistentScriptButtons=function(buttons){var current=window.getScriptButtons();var names=new Set(current.map(function(button){return button.name}));window.replaceScriptButtons(current.concat(__dshScriptButtons(buttons).filter(function(button){return !names.has(button.name)})))};
window.getButtonEvent=function(name){return __dshSnapshot.scriptId+'_'+String(name)};
window.getLastMessageId=function(){return Math.max(-1,__dshMessages.length-1)};
window.getCurrentMessageId=window.getLastMessageId;
function __dshMessageId(value){if(__dshMessages.length===0)return;var id=Number(String(value).replaceAll('{{lastMessageId}}',String(__dshMessages.length-1)));if(!Number.isInteger(id))return;if(id<0)id=__dshMessages.length+id;if(id<0||id>=__dshMessages.length)return;return id}
function __dshMessageRange(range){if(__dshMessages.length===0)return [];var source=String(range??('0-'+(__dshMessages.length-1))).replaceAll('{{lastMessageId}}',String(__dshMessages.length-1));var match=source.match(/^(-?\\d+)(?:-(-?\\d+))?$/);if(!match)return [];var left=__dshMessageId(match[1]);var right=__dshMessageId(match[2]??match[1]);if(left===undefined||right===undefined)return [];var start=Math.min(left,right),end=Math.max(left,right);return __dshMessages.slice(start,end+1)}
function __dshMessageBoundary(value){if(value==='end')return __dshMessages.length;var id=Number(String(value).replaceAll('{{lastMessageId}}',String(__dshMessages.length-1)));if(!Number.isInteger(id))return __dshMessages.length;if(id<0)id=__dshMessages.length+id+1;return Math.min(__dshMessages.length,Math.max(0,id))}
function __dshReindexMessages(){__dshMessages=__dshMessages.map(function(message,messageId){return Object.assign({},message,{messageId:messageId})})}
function __dshMessageSignature(messages){return JSON.stringify((messages??[]).map(function(message){return [message.seq,message.role,message.text,message.isHidden===true]}))}
function __dshSyncSillyTavernChat(){if(!window.SillyTavern)return;window.SillyTavern.chat=__dshMessages.map(function(message){return {name:message.role==='user'?(__dshSnapshot.userName??'用户'):__dshSnapshot.characterName,is_user:message.role==='user',is_system:false,is_hidden:message.isHidden===true,mes:message.text,swipe_id:0,swipes:[message.text],variables:[message.data??{}],swipe_info:[message.extra??{}],extra:message.extra??{}}})}
function __dshDisplayedMessageId(value){if(__dshMessages.length===0)throw new Error('未找到任何消息楼层');if(value===undefined||value==='last')return __dshMessages.length-1;if(value==='last_user'||value==='last_char'){var role=value==='last_user'?'user':'assistant';for(var index=__dshMessages.length-1;index>=0;index--)if(__dshMessages[index]?.role===role)return index;throw new Error(value==='last_user'?'未找到任何 user 消息楼层':'未找到任何 char 消息楼层')}var id=__dshMessageId(value);if(id===undefined)throw new Error('提供的 message_id 不在当前聊天楼层范围内: '+String(value));return id}
function __dshApplyMacroLikes(value,messageId,role){var context={...(Number.isInteger(messageId)?{message_id:messageId}:{}),...(['user','assistant','system'].includes(role)?{role:role}:{})};for(var macro of __dshMacroLikes){macro.regex.lastIndex=0;value=String(value).replace(macro.regex,function(){return String(macro.replace.apply(undefined,[context].concat(Array.from(arguments))))})}return value}
window.unregisterMacroLike=function(regex){if(!(regex instanceof RegExp))return;var index=__dshMacroLikes.findIndex(function(macro){return macro.regex.source===regex.source});if(index>=0)__dshMacroLikes.splice(index,1)};
window.registerMacroLike=function(regex,replace){if(!(regex instanceof RegExp))throw new Error('助手宏必须使用 RegExp');if(typeof replace!=='function')throw new Error('助手宏替换器必须是函数');if(!__dshMacroLikes.some(function(macro){return macro.regex.source===regex.source}))__dshMacroLikes.push({regex:regex,replace:replace});return {unregister:function(){window.unregisterMacroLike(regex)}}};
function __dshLastMessage(role){for(var index=__dshMessages.length-1;index>=0;index--){var message=__dshMessages[index];if(role===undefined||message?.role===role)return String(message?.text??'')}return ''}
function __dshPublicVariable(value){if(Array.isArray(value))return value.map(__dshPublicVariable);if(__dshPlain(value))return Object.fromEntries(Object.entries(value).filter(function(pair){return !pair[0].startsWith('$')}).map(function(pair){return [pair[0],__dshPublicVariable(pair[1])] }));return value}
function __dshVariableScope(type,messageId){if(type==='message'){var id=Number.isInteger(messageId)?messageId:__dshMessages.length-1;return __dshMessages[id]?.data??__dshScopes.message??{}}return __dshScopes[type]??{}}
function __dshYamlString(value){value=String(value).replace(/\\r\\n?/g,'\\n');if(value.includes('\\n'))return;var ambiguous=/^(?:null|true|false|~|[-+]?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:e[-+]?\\d+)?|[-+]?\\.(?:inf|nan))$/iu.test(value);var unsafe=value===''||value.trim()!==value||ambiguous||!/^[\\p{L}\\p{N}_./#:+ -]+$/u.test(value)||value.startsWith('#')||/^(?:-|\\?|:)\\s/u.test(value)||/:\\s|\\s#/u.test(value);return unsafe?JSON.stringify(value):value}
function __dshYamlScalar(value){if(value===null)return 'null';if(typeof value==='string')return __dshYamlString(value);return String(value)}
function __dshYamlMultiline(value,indent,head){var source=String(value).replace(/\\r\\n?/g,'\\n'),keep=source.endsWith('\\n'),body=keep?source.slice(0,-1):source,pad=' '.repeat(indent);return [head+(keep?'|':'|-')].concat(body.split('\\n').map(function(line){return pad+line}))}
function __dshYamlLines(value,indent){var pad=' '.repeat(indent);if(typeof value==='string'&&value.includes('\\n'))return __dshYamlMultiline(value,indent,pad);if(Array.isArray(value)){if(value.length===0)return [pad+'[]'];var array=[];for(var item of value){if(typeof item==='string'&&item.includes('\\n'))array.push.apply(array,__dshYamlMultiline(item,indent+2,pad+'- '));else if(Array.isArray(item)||__dshPlain(item)){array.push(pad+'-');array.push.apply(array,__dshYamlLines(item,indent+2))}else array.push(pad+'- '+__dshYamlScalar(item))}return array}if(__dshPlain(value)){var entries=Object.entries(value);if(entries.length===0)return [pad+'{}'];var object=[];for(var pair of entries){var key=__dshYamlString(pair[0])??JSON.stringify(pair[0]),item=pair[1];if(typeof item==='string'&&item.includes('\\n'))object.push.apply(object,__dshYamlMultiline(item,indent+2,pad+key+': '));else if(Array.isArray(item)||__dshPlain(item)){object.push(pad+key+':');object.push.apply(object,__dshYamlLines(item,indent+2))}else object.push(pad+key+': '+__dshYamlScalar(item))}return object}return [pad+__dshYamlScalar(value)]}
function __dshYaml(value){return __dshYamlLines(value,0).join('\\n')}
var __dshFormatVariableRegex=/^(.*)\\{\\{format_(message|chat|character|preset|global)_variable::(.*?)\\}\\}/im;
function __dshFormatVariable(context,_match,prefix,type,path){var nested=prefix.match(__dshFormatVariableRegex);if(nested)prefix=__dshFormatVariable(context,'',nested[1],nested[2],nested[3])+prefix.slice(nested[0].length);var value=__dshPublicVariable(__dshGet(__dshVariableScope(type,context.message_id),path,null));return prefix+__dshYaml(value).replaceAll('\\n','\\n'+' '.repeat(prefix.length))}
window.registerMacroLike(/\\{\\{get_(message|chat|character|preset|global)_variable::(.*?)\\}\\}/gi,function(context,_match,type,path){var value=__dshPublicVariable(__dshGet(__dshVariableScope(type,context.message_id),path,null));return typeof value==='string'?value:JSON.stringify(value)});
window.registerMacroLike(/^(.*)\\{\\{format_(message|chat|character|preset|global)_variable::(.*?)\\}\\}/gim,__dshFormatVariable);
function __dshDisplayMacros(value,messageId,transform,role){var applyRegistered=transform===undefined;transform=transform??function(item){return item};var result=String(value).replace(/\\{\\{char\\}\\}|<char>|<bot>/giu,transform(__dshSnapshot.characterName)).replace(/\\{\\{user\\}\\}|<user>/giu,transform(__dshSnapshot.userName??'用户')).replace(/\\{\\{lastMessage\\}\\}/giu,transform(__dshLastMessage())).replace(/\\{\\{lastUserMessage\\}\\}/giu,transform(__dshLastMessage('user'))).replace(/\\{\\{lastCharMessage\\}\\}/giu,transform(__dshLastMessage('assistant'))).replace(/\\{\\{lastMessageId\\}\\}/giu,String(__dshMessages.length-1)).replace(/\\{\\{messageId\\}\\}/giu,String(messageId));return applyRegistered?__dshApplyMacroLikes(result,messageId,role??__dshMessages[messageId]?.role):result}
window.substitudeMacros=function(text){var messageId=Math.max(-1,__dshMessages.length-1);return __dshDisplayMacros(String(text??''),messageId)};
window.substituteParams=window.substitudeMacros;
function __dshDisplayRegex(value){try{var literal=String(value).match(/^\\/([\\s\\S]*)\\/([a-z]*)$/iu);return literal===null?new RegExp(String(value)):new RegExp(literal[1]??'',literal[2]??'')}catch(error){return}}
function __dshEscapeDisplayRegex(value){return String(value).replace(/[\\n\\r\\t\\v\\f\\0.^$*+?{}[\\]\\\\/|()]/gu,function(character){if(character==='\\n')return '\\\\n';if(character==='\\r')return '\\\\r';if(character==='\\t')return '\\\\t';if(character==='\\v')return '\\\\v';if(character==='\\f')return '\\\\f';if(character==='\\0')return '\\\\0';return '\\\\'+character})}
function __dshDisplayReplace(raw,script,messageId){var mode=Number(script.substituteRegex);var findSource=mode===1?__dshDisplayMacros(script.findRegex,messageId):mode===2?__dshDisplayMacros(script.findRegex,messageId,__dshEscapeDisplayRegex):script.findRegex;var find=__dshDisplayRegex(findSource);if(!find||!script.findRegex||!raw)return raw;return raw.replace(find,function(){var args=Array.from(arguments);var groups=typeof args.at(-1)==='object'&&args.at(-1)!==null?args.at(-1):undefined;var replacement=String(script.replaceString??'').replace(/\\{\\{match\\}\\}/giu,'$0').replace(/\\$(\\d+)|\\$<([^>]+)>/gu,function(token,numeric,named){var match=numeric===undefined?groups?.[named??'']:args[Number(numeric)];if(typeof match!=='string')return '';return (script.trimStrings??[]).reduce(function(text,trim){return text.replaceAll(__dshDisplayMacros(trim,messageId),'')},match)});return __dshDisplayMacros(replacement,messageId)})}
window.formatAsTavernRegexedString=function(text,source,destination,option){if(!['user_input','ai_output','slash_command','world_info','reasoning'].includes(source))throw new Error('不支持的预设正则来源: '+String(source));if(destination!=='display'&&destination!=='prompt')throw new Error('不支持的预设正则目标: '+String(destination));option=option??{};if(option.character_name!==undefined&&option.character_name!==__dshSnapshot.characterName)throw new Error('当前仅支持使用当前角色名格式化预设正则');var depth=typeof option.depth==='number'&&Number.isFinite(option.depth)?option.depth:undefined;var messageId=depth===undefined?Math.max(0,__dshMessages.length-1):Math.max(0,__dshMessages.length-depth-1);var value=String(text??'');for(var regex of __dshPresetRegexes()){if(regex.enabled===false||regex.source?.[source]!==true||regex.destination?.[destination]!==true)continue;if(depth!==undefined&&regex.min_depth!==null&&regex.min_depth>=-1&&depth<regex.min_depth)continue;if(depth!==undefined&&regex.max_depth!==null&&regex.max_depth>=0&&depth>regex.max_depth)continue;value=__dshDisplayReplace(value,{findRegex:regex.find_regex,replaceString:regex.replace_string,trimStrings:regex.trim_strings,substituteRegex:0},messageId)}var role=source==='user_input'?'user':source==='ai_output'?'assistant':'system';return __dshDisplayMacros(value,messageId,undefined,role)};
function __dshDisplayedSource(text,messageId){var message=__dshMessages[messageId];var placement=message?.role==='user'?1:2;var depth=Math.max(0,__dshMessages.length-messageId-1);var value=__dshDisplayMacros(text,messageId);for(var phase of ['message','markdown'])for(var script of __dshDisplayRegexScripts??[]){if(script.disabled||!Array.isArray(script.placement)||!script.placement.includes(placement))continue;if(phase==='message'&&(script.markdownOnly||script.promptOnly))continue;if(phase==='markdown'&&!script.markdownOnly)continue;if(script.minDepth!==null&&script.minDepth>=-1&&depth<script.minDepth)continue;if(script.maxDepth!==null&&script.maxDepth>=0&&depth>script.maxDepth)continue;value=__dshDisplayReplace(value,script,messageId)}return value}
function __dshEscapeHtml(value){return String(value).replace(/&/gu,'&amp;').replace(/</gu,'&lt;').replace(/>/gu,'&gt;').replace(/"/gu,'&quot;').replace(/'/gu,'&#39;')}
function __dshMarkdownProse(value){var html=__dshEscapeHtml(value),tick=String.fromCharCode(96);html=html.replace(/\\*\\*([^*\\n]+)\\*\\*/gu,'<strong>$1</strong>').replace(/\\*([^*\\n]+)\\*/gu,'<em>$1</em>').replace(new RegExp(tick+'([^'+tick+'\\\\n]+)'+tick,'gu'),'<code>$1</code>');return html.trim()===''?'':html.trim().split(/\\n{2,}/u).map(function(paragraph){return '<p>'+paragraph.replace(/\\n/gu,'<br>')+'</p>'}).join('')}
function __dshMarkdownHtml(text){var source=String(text??''),result='',cursor=0,tick=String.fromCharCode(96),marker=tick.repeat(3),fence=new RegExp(marker+'([^'+tick+'\\\\n]*)\\\\n([\\\\s\\\\S]*?)'+marker,'gu'),match;while((match=fence.exec(source))!==null){result+=__dshMarkdownProse(source.slice(cursor,match.index));var language=match[1].trim().replace(/[^A-Za-z0-9_-]/gu,'');var code=match[2].replace(/\\n$/u,'');result+='<pre><code'+(language?' class="language-'+language+'"':'')+'>'+__dshEscapeHtml(code)+'</code></pre>';cursor=match.index+match[0].length}return result+__dshMarkdownProse(source.slice(cursor))}
function __dshDisplayedHtml(text,messageId){var value=__dshDisplayedSource(text,messageId);var marker=String.fromCharCode(96).repeat(3);var trimmed=value.trim();if(trimmed.slice(0,marker.length+4).toLowerCase()===marker+'html'&&trimmed.endsWith(marker)){var newline=trimmed.indexOf('\\n');return newline<0?'':trimmed.slice(newline+1,-marker.length).trim()}if(/<\\/?[A-Za-z][^>]*>/u.test(value))return value;return __dshMarkdownHtml(value)}
window.getChatMessages=function(range,option){option=option??{};return __dshClone(__dshMessageRange(range).flatMap(function(message){if(option.role&&option.role!=='all'&&option.role!==message.role)return [];if(option.hide_state==='hidden'&&message.isHidden!==true)return [];if(option.hide_state==='unhidden'&&message.isHidden===true)return [];if(option.include_swipes)return [{message_id:message.messageId,name:message.role==='user'?(__dshSnapshot.userName??'用户'):__dshSnapshot.characterName,role:message.role,is_hidden:message.isHidden===true,swipe_id:0,swipes:[message.text],swipes_data:[message.data??{}],swipes_info:[message.extra??{}]}];return [{message_id:message.messageId,name:message.role==='user'?(__dshSnapshot.userName??'用户'):__dshSnapshot.characterName,role:message.role,is_hidden:message.isHidden===true,message:message.text,data:message.data??{},extra:message.extra??{},swipe_id:0,swipes:[message.text],swipes_data:[message.data??{}]}]}))};
window.setChatMessages=function(messages){messages=(Array.isArray(messages)?messages:[]).flatMap(function(message){var messageId=__dshMessageId(message?.message_id);return messageId===undefined?[]:[Object.assign({},__dshClone(message),{message_id:messageId})]});if(messages.length===0)return Promise.resolve();return __dshChatMutation({format:0,operation:'set-chat-messages',messages:messages}).then(function(){for(var update of messages){var current=__dshMessages[update.message_id];if(!current)continue;var swipeId=update.swipe_id??0;var text=update.message??update.swipes?.[swipeId]??current.text;var data=update.data??update.swipes_data?.[swipeId]??current.data;var extra=update.extra??update.swipes_info?.[swipeId]??current.extra;__dshMessages[update.message_id]=Object.assign({},current,{role:update.role??current.role,text:text,data:data??{},extra:extra??{}})}__dshSyncSillyTavernChat();return Promise.all(messages.map(function(message){return window.eventEmit(window.tavern_events.MESSAGE_UPDATED,message.message_id)}))})};
window.createChatMessages=function(messages,option){messages=Array.isArray(messages)?__dshClone(messages):[];if(messages.length===0)return Promise.resolve();option=option??{};var insertAt=__dshMessageBoundary(option.insert_at??option.insert_before??'end');return __dshChatMutation({format:0,operation:'create-chat-messages',messages:messages,insertAt:insertAt}).then(function(){var created=messages.map(function(message){return {messageId:0,role:message.role,text:String(message.message??''),isHidden:false,data:message.data??{},extra:message.extra??{}}});__dshMessages.splice(insertAt,0,...created);__dshReindexMessages();__dshSyncSillyTavernChat();return Promise.all(created.map(function(message,index){var id=insertAt+index;return window.eventEmit(message.role==='user'?window.tavern_events.MESSAGE_SENT:window.tavern_events.MESSAGE_RECEIVED,id,'extension')}))})};
window.deleteChatMessages=function(messageIds){messageIds=Array.from(new Set((Array.isArray(messageIds)?messageIds:[]).flatMap(function(value){var id=__dshMessageId(value);return id===undefined?[]:[id]}))).sort(function(a,b){return a-b});if(messageIds.length===0)return Promise.resolve();return __dshChatMutation({format:0,operation:'delete-chat-messages',messageIds:messageIds}).then(function(){for(var id of [...messageIds].reverse())__dshMessages.splice(id,1);__dshReindexMessages();__dshSyncSillyTavernChat();return Promise.all(messageIds.map(function(id){return window.eventEmit(window.tavern_events.MESSAGE_DELETED,id)}))})};
window.rotateChatMessages=function(begin,middle,end){begin=__dshMessageBoundary(begin);middle=__dshMessageBoundary(middle);end=__dshMessageBoundary(end);middle=Math.min(end,Math.max(begin,middle));if(begin===middle||middle===end)return Promise.resolve();return __dshChatMutation({format:0,operation:'rotate-chat-messages',begin:begin,middle:middle,end:end}).then(function(){var right=__dshMessages.splice(middle,end-middle);__dshMessages.splice(begin,0,...right);__dshReindexMessages();__dshSyncSillyTavernChat();return window.eventEmit(window.tavern_events.CHAT_CHANGED,'dsh-agent-rp')})};
var __dshNativeFetch=window.fetch.bind(window);
function __dshGenerationBody(config){var value=__dshClone(config??{});var custom=__dshPlain(value.custom_api)?value.custom_api:null;return Object.assign({},value,{chat_completion_source:custom?String(custom.source??'openai'):'dsh',...(custom&&typeof custom.apiurl==='string'?{reverse_proxy:custom.apiurl,custom_url:custom.apiurl}:{}),...(custom&&typeof custom.key==='string'?{proxy_password:custom.key}:{}),...(custom&&typeof custom.model==='string'?{model:custom.model}:{}),messages:[],stream:false})}
function __dshGenerationConfig(body){var value=__dshClone(body);for(var key of ['__dsh_generation_mode','chat_completion_source','reverse_proxy','custom_url','proxy_password','model','messages','stream'])delete value[key];var fields=['custom_include_body','custom_exclude_body','custom_include_headers'];if(fields.some(function(key){return body[key]!==undefined})){if(!__dshPlain(value.custom_api))throw new Error('附加请求参数只能用于自定义 API');value.custom_api=Object.assign({},value.custom_api);for(var field of fields)if(body[field]!==undefined)value.custom_api[field]=body[field]}for(var field of fields)delete value[field];return value}
function __dshOpenAiResponse(value,generationId){return {id:generationId||'dsh-agent-rp-'+Date.now(),object:'chat.completion',created:Math.floor(Date.now()/1000),model:'dsh-agent-rp',choices:[{index:0,message:{role:'assistant',content:String(value??'')},finish_reason:'stop'}]}}
function __dshGenerationError(value){if(typeof value==='string')return value;if(!value||typeof value!=='object')return '生成失败';var error=value.error;if(typeof error==='string')return error;if(error&&typeof error==='object'&&typeof error.message==='string')return error.message;return typeof value.message==='string'?value.message:'生成失败'}
function __dshGenerationText(value){if(!value||typeof value!=='object')throw new Error('模型返回了无法识别的结果');var choice=Array.isArray(value.choices)?value.choices[0]:undefined;var content=choice?.message?.content??choice?.text;if(typeof content==='string')return content;if(Array.isArray(content)){var text=content.flatMap(function(item){return typeof item==='string'?[item]:item&&typeof item==='object'&&typeof item.text==='string'?[item.text]:[]}).join('');if(text)return text}throw new Error('模型没有返回文本')}
window.fetch=function(input,init){var url=typeof input==='string'?input:input?.url??String(input??'');if(!String(url).includes('/api/backends/chat-completions/generate'))return __dshNativeFetch(input,init);var body=init?.body;if(typeof body!=='string')return Promise.resolve(new Response(JSON.stringify({error:{message:'生成请求体必须是 JSON 文本'}}),{status:400,headers:{'content-type':'application/json'}}));var parsed;try{parsed=JSON.parse(body)}catch(error){return Promise.resolve(new Response(JSON.stringify({error:{message:'生成请求体不是有效 JSON'}}),{status:400,headers:{'content-type':'application/json'}}))}if(!__dshPlain(parsed))return Promise.resolve(new Response(JSON.stringify({error:{message:'生成请求体必须是对象'}}),{status:400,headers:{'content-type':'application/json'}}));var requestId=String(++__dshRequest);var config;try{config=__dshGenerationConfig(parsed)}catch(error){return Promise.resolve(new Response(JSON.stringify({error:{message:String(error?.message??error)}}),{status:400,headers:{'content-type':'application/json'}}))}return new Promise(function(resolve){__dshPending.set(requestId,{resolve:resolve,generationFetch:true});__dshPost('generate',{requestId:requestId,mode:parsed.__dsh_generation_mode==='preset'?'preset':'raw',config:config})}).then(function(result){if(result.ok)return new Response(JSON.stringify(__dshOpenAiResponse(result.value,typeof parsed.generation_id==='string'?parsed.generation_id:undefined)),{status:200,headers:{'content-type':'application/json'}});return new Response(JSON.stringify({error:{message:String(result.error??'生成失败')}}),{status:400,headers:{'content-type':'application/json'}})})};
function __dshHasPromptListener(type){return (__dshListeners.get(String(type))??[]).length>0}
function __dshPromptPreview(mode,config){var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('generation-preview',{requestId:requestId,mode:mode,config:__dshClone(config)})})}
async function __dshEmitPromptPreview(prompts,config){var generationId=typeof config.generation_id==='string'?config.generation_id:undefined;if(__dshHasPromptListener(window.tavern_events.CHAT_COMPLETION_PROMPT_READY))await __dshEmitLocal(window.tavern_events.CHAT_COMPLETION_PROMPT_READY,[{chat:__dshClone(prompts),generation_id:generationId}]);if(__dshHasPromptListener(window.tavern_events.GENERATE_AFTER_DATA))await __dshEmitLocal(window.tavern_events.GENERATE_AFTER_DATA,[{prompt:__dshClone(prompts),generation_id:generationId},false]);if(__dshHasPromptListener(window.tavern_events.GENERATE_AFTER_COMBINE_PROMPTS))await __dshEmitLocal(window.tavern_events.GENERATE_AFTER_COMBINE_PROMPTS,[{prompt:__dshClone(prompts),generation_id:generationId}])}
async function __dshGenerate(mode,config){var value=__dshClone(config??{});value.__dsh_generation_mode=mode;await __dshRefreshInjections();await __dshInjectionWrite;void __dshEmitLocal(window.iframe_events.GENERATION_STARTED,[]);var promptEvents=[window.tavern_events.CHAT_COMPLETION_PROMPT_READY,window.tavern_events.GENERATE_AFTER_DATA,window.tavern_events.GENERATE_AFTER_COMBINE_PROMPTS];if(promptEvents.some(__dshHasPromptListener)){var prompts=await __dshPromptPreview(mode,__dshGenerationConfig(__dshGenerationBody(value)));await __dshEmitPromptPreview(prompts,value)}var response=await window.fetch('/api/backends/chat-completions/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(__dshGenerationBody(value))});var raw=await response.text();var result;try{result=JSON.parse(raw)}catch(error){throw new Error(response.ok?'模型返回了无法识别的结果':'生成失败（'+response.status+'）')}if(!response.ok)throw new Error(__dshGenerationError(result));var text=__dshGenerationText(result);if(value.should_stream===true){void __dshEmitLocal(window.iframe_events.STREAM_TOKEN_RECEIVED_FULLY,[text]);void __dshEmitLocal(window.iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY,[text])}void __dshEmitLocal(window.iframe_events.GENERATION_ENDED,[text]);__dshConsumeOnceInjections();return text}
window.generate=function(config){return __dshGenerate('preset',config)};
window.generateRaw=function(config){return __dshGenerate('raw',config)};
window.stopGenerationById=function(value){__dshPost('generation-cancel',{generationId:String(value??'')});return true};
window.stopAllGeneration=function(){__dshPost('generation-cancel-all');return true};
window.getModelList=function(config){if(!__dshPlain(config)||typeof config.apiurl!=='string'||config.apiurl.trim()==='')return Promise.reject(new Error('API 地址不能为空'));if(config.key!==undefined&&typeof config.key!=='string')return Promise.reject(new Error('API 密钥必须是文本'));var requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('model-list',{requestId:requestId,apiurl:config.apiurl,key:config.key})})};
window.triggerSlash=function(value){var command=String(value),requestId=String(++__dshRequest);return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('trigger-slash',{requestId:requestId,value:command})}).then(function(){var match=command.match(/^\\/(hide|unhide)\\s+(\\d+)(?:-(\\d+))?\\s*$/i);if(match){var left=Number(match[2]),right=Number(match[3]??match[2]),start=Math.max(0,Math.min(left,right)),end=Math.min(__dshMessages.length-1,Math.max(left,right)),hidden=match[1].toLowerCase()==='hide';for(var index=start;index<=end;index++)if(__dshMessages[index])__dshMessages[index].isHidden=hidden;__dshSyncSillyTavernChat()}return ''})};
window.errorCatched=function(fn){return function(){try{return Promise.resolve(fn.apply(this,arguments)).catch(console.error)}catch(error){console.error(error)}}};
function __dshOn(type,listener,mode){var list=__dshListeners.get(String(type))??[];if(list.some(entry=>entry.listener===listener))return {stop:function(){}};var entry={listener:listener,once:mode==='once'};if(mode==='first')list.unshift(entry);else list.push(entry);__dshListeners.set(String(type),list);return {stop:function(){window.eventRemoveListener(type,listener)}}}
window.eventOn=function(type,listener){return __dshOn(type,listener)};
window.eventOnce=function(type,listener){return __dshOn(type,listener,'once')};
window.eventMakeFirst=function(type,listener){window.eventRemoveListener(type,listener);return __dshOn(type,listener,'first')};
window.eventMakeLast=function(type,listener){window.eventRemoveListener(type,listener);return __dshOn(type,listener)};
window.eventRemoveListener=function(type,listener){var list=__dshListeners.get(String(type))??[];__dshListeners.set(String(type),list.filter(entry=>entry.listener!==listener))};
window.eventClearEvent=function(type){__dshListeners.delete(String(type))};
window.eventClearListener=function(listener){for(var pair of __dshListeners)__dshListeners.set(pair[0],pair[1].filter(entry=>entry.listener!==listener))};
window.eventClearAll=function(){__dshListeners.clear()};
async function __dshEmitLocal(type,args){var list=[...(__dshListeners.get(String(type))??[])];for(var entry of list){await entry.listener.apply(window,args);if(entry.once)window.eventRemoveListener(type,entry.listener)}}
window.eventEmit=function(type){var args=Array.prototype.slice.call(arguments,1);__dshPost('event-emit',{eventType:String(type),args:__dshClone(args)});return __dshEmitLocal(type,args)};
window.eventEmitAndWait=window.eventEmit;
window.eventOnButton=window.eventOn;
window.iframe_events={MESSAGE_IFRAME_RENDER_STARTED:'message_iframe_render_started',MESSAGE_IFRAME_RENDER_ENDED:'message_iframe_render_ended',GENERATION_STARTED:'js_generation_started',STREAM_TOKEN_RECEIVED_FULLY:'js_stream_token_received_fully',STREAM_TOKEN_RECEIVED_INCREMENTALLY:'js_stream_token_received_incrementally',GENERATION_ENDED:'js_generation_ended'};
window.tavern_events={APP_READY:'app_ready',MESSAGE_SENT:'message_sent',MESSAGE_RECEIVED:'message_received',MESSAGE_EDITED:'message_edited',MESSAGE_DELETED:'message_deleted',MESSAGE_UPDATED:'message_updated',CHAT_CHANGED:'chat_id_changed',GENERATION_STARTED:'generation_started',GENERATION_STOPPED:'generation_stopped',GENERATION_ENDED:'generation_ended',CHAT_COMPLETION_PROMPT_READY:'chat_completion_prompt_ready',GENERATE_AFTER_DATA:'generate_after_data',GENERATE_AFTER_COMBINE_PROMPTS:'generate_after_combine_prompts',USER_MESSAGE_RENDERED:'user_message_rendered',CHARACTER_MESSAGE_RENDERED:'character_message_rendered'};
var __dshPopupType=Object.freeze({TEXT:1,CONFIRM:2,INPUT:3,DISPLAY:4,CROP:5});
var __dshPopupResult=Object.freeze({AFFIRMATIVE:1,NEGATIVE:0,CANCELLED:null,CUSTOM1:1001,CUSTOM2:1002,CUSTOM3:1003,CUSTOM4:1004,CUSTOM5:1005,CUSTOM6:1006,CUSTOM7:1007,CUSTOM8:1008,CUSTOM9:1009});
function __dshPopupContent(value){if(value instanceof Mini)return value.items.map(function(item){return item?.outerHTML??item?.textContent??''}).join('');if(value instanceof Element)return value.outerHTML;return String(value??'')}
function __dshPopupOptions(value){if(!__dshPlain(value))return {};var result={};for(var key of ['okButton','cancelButton'])if(typeof value[key]==='string'||typeof value[key]==='boolean')result[key]=value[key];for(var key of ['placeholder','tooltip'])if(typeof value[key]==='string')result[key]=value[key].slice(0,2000);if(Number.isSafeInteger(value.rows))result.rows=Math.max(1,Math.min(20,value.rows));for(var key of ['wide','wider','large','leftAlign','allowEscapeClose'])if(typeof value[key]==='boolean')result[key]=value[key];if(Array.isArray(value.customButtons))result.customButtons=value.customButtons.slice(0,9).flatMap(function(button,index){if(typeof button==='string')return [{text:button.slice(0,200),result:index+2}];if(!__dshPlain(button)||typeof button.text!=='string')return [];return [{text:button.text.slice(0,200),result:typeof button.result==='number'&&Number.isFinite(button.result)?button.result:index+2}]});return result}
function __dshCallGenericPopup(content,type,inputValue,options){if(![1,2,3,4].includes(type))return Promise.reject(new Error(type===5?'当前不支持图片裁剪弹窗':'弹窗类型无效'));var requestId=String(++__dshRequest);var value=__dshPopupContent(content);if(value.length>262144)return Promise.reject(new Error('弹窗内容超过 256 KiB'));var input=String(inputValue??'');if(input.length>65536)return Promise.reject(new Error('弹窗输入超过 64 KiB'));return new Promise(function(resolve,reject){__dshPending.set(requestId,{resolve:resolve,reject:reject});__dshPost('popup-request',{requestId:requestId,popupType:type,content:value,inputValue:input,options:__dshPopupOptions(options)})})}
function __dshPopupMessage(title,message){var heading=String(title??'').trim();return (heading?'<h3>'+__dshEscapeHtml(heading)+'</h3>':'')+__dshMarkdownHtml(message??'')}
function __DshPopup(content,type,inputValue,options){this.content=content;this.type=type;this.inputValue=inputValue;this.options=options}
__DshPopup.prototype.show=function(){return __dshCallGenericPopup(this.content,this.type,this.inputValue,this.options)};
__DshPopup.show={confirm:function(title,message,options){return __dshCallGenericPopup(__dshPopupMessage(title,message),__dshPopupType.CONFIRM,'',options).then(function(result){return result===true||result===__dshPopupResult.AFFIRMATIVE})},input:function(title,message,defaultValue,options){return __dshCallGenericPopup(__dshPopupMessage(title,message),__dshPopupType.INPUT,defaultValue,options)},text:function(title,message,options){return __dshCallGenericPopup(__dshPopupMessage(title,message),__dshPopupType.TEXT,'',options).then(function(){})},display:function(content,options){return __dshCallGenericPopup(content,__dshPopupType.DISPLAY,'',options)}};
window.Mvu={events:{VARIABLE_INITIALIZED:'mag_variable_initialized',VARIABLE_UPDATE_STARTED:'mag_variable_update_started',COMMAND_PARSED:'mag_command_parsed',VARIABLE_UPDATE_ENDED:'mag_variable_update_ended',BEFORE_MESSAGE_UPDATE:'mag_before_message_update'},getMvuData:function(option){return window.getVariables(option??{type:'message'})},replaceMvuData:function(value,option){return __dshReplace(value,option??{type:'message'})},isDuringExtraAnalysis:function(){return false}};
function __dshChatMetadata(){return Object.assign({},__dshClone(__dshScopes.chat??{}),{wi_activated:__dshClone(__dshActiveWorldbookEntries??[])})}
var __dshCurrentChatMetadata=__dshChatMetadata();
function __dshCurrentCharacter(){var raw=__dshClone(__dshSnapshot.characterCard);if(!__dshPlain(raw))return;var data=__dshPlain(raw.data)?raw.data:raw;var name=typeof data.name==='string'&&data.name.trim()?data.name:__dshSnapshot.characterName;return Object.assign({},raw,__dshClone(data),{name:name,avatar:__dshSnapshot.characterId,description:String(data.description??''),personality:String(data.personality??''),scenario:String(data.scenario??''),first_mes:String(data.first_mes??''),mes_example:String(data.mes_example??''),data:__dshClone(data)})}
var __dshCharacter=__dshCurrentCharacter();
var __dshCharacters=__dshCharacter===undefined?[]:[__dshCharacter];
window.characters=__dshCharacters;
window.this_chid=__dshCharacter===undefined?undefined:0;
window.getCharData=function(name){name=name||'current';if(__dshCharacter===undefined)return null;if(name!=='current'&&name!==__dshCharacter.name&&name!==__dshCharacter.avatar&&name!==__dshSnapshot.characterName)return null;return __dshClone(__dshCharacter)};
window.getCharacterNames=function(){return __dshCharacters.map(function(character){return character.name})};
window.getCharacterIds=function(){return __dshCharacters.map(function(character){return character.avatar})};
window.uuidv4=function(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();var bytes=new Uint8Array(16);crypto.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;return Array.from(bytes,function(value,index){var hex=value.toString(16).padStart(2,'0');return [4,6,8,10].includes(index)?'-'+hex:hex}).join('')};
window.SillyTavern={chat:[],name1:__dshSnapshot.userName??'用户',name2:__dshSnapshot.characterName,characters:__dshCharacters,this_chid:window.this_chid,characterId:window.this_chid,groups:[],groupId:null,chatId:__dshSnapshot.chatId,chatMetadata:__dshCurrentChatMetadata,chat_metadata:__dshCurrentChatMetadata,extensionSettings:__dshExtensionSettings,libs:{},saveSettingsDebounced:__dshSaveSettingsDebounced,saveChat:function(){return Promise.resolve()},Popup:__DshPopup,POPUP_TYPE:__dshPopupType,POPUP_RESULT:__dshPopupResult,callGenericPopup:__dshCallGenericPopup,getCurrentCharacterId:window.getCurrentCharId,getCurrentChatId:window.getCurrentChatId,uuidv4:window.uuidv4,substituteParams:window.substituteParams,eventSource:{on:window.eventOn,once:window.eventOnce,emit:window.eventEmit,emitAndWait:window.eventEmitAndWait,removeListener:window.eventRemoveListener},eventTypes:window.tavern_events,getContext:function(){return this}};
window.getContext=function(){return window.SillyTavern.getContext()};
window.saveSettingsDebounced=__dshSaveSettingsDebounced;
window.extension_settings=__dshExtensionSettings;
__dshSyncSillyTavernChat();
window.TavernHelper=window;
var __dshFrameHost=document.createElement('div');
var __dshFrameElement=document.createElement('iframe');
__dshFrameHost.hidden=true;__dshFrameHost.appendChild(__dshFrameElement);document.body.appendChild(__dshFrameHost);
try{Object.defineProperty(window,'frameElement',{configurable:true,value:__dshFrameElement})}catch(error){}
var __dshSurfaceReported;
var __dshSurfaceScheduled=false;
function __dshHasSurface(){return Array.from(document.body.children).some(function(element){if(element===__dshFrameHost||element.tagName==='SCRIPT'||element.tagName==='STYLE'||element.tagName==='LINK'||element.hidden)return false;var style=getComputedStyle(element);return style.display!=='none'&&style.visibility!=='hidden'})}
function __dshReportSurface(){__dshSurfaceScheduled=false;var visible=__dshHasSurface();if(visible===__dshSurfaceReported)return;__dshSurfaceReported=visible;__dshPost('surface',{visible:visible})}
function __dshScheduleSurface(){if(__dshSurfaceScheduled)return;__dshSurfaceScheduled=true;queueMicrotask(__dshReportSurface)}
new MutationObserver(__dshScheduleSurface).observe(document.body,{attributes:true,attributeFilter:['class','hidden','style'],childList:true,subtree:true});
__dshScheduleSurface();
var __dshApprovedOrigins=new Set(__dshSnapshot.approvedScriptOrigins);
var __dshNativeAppend=Element.prototype.appendChild;
var __dshNativeInsert=Element.prototype.insertBefore;
function __dshGuardScript(node){if(node?.tagName!=='SCRIPT'||!node.src)return;var origin;try{origin=new URL(node.src).origin}catch(error){origin=String(node.src)};if(__dshApprovedOrigins.has(origin))return;node.type='application/x-dsh-blocked';node.removeAttribute('src');__dshPost('external-script-request',{origin:origin})}
Element.prototype.appendChild=function(node){__dshGuardScript(node);return __dshNativeAppend.call(this,node)};
Element.prototype.insertBefore=function(node,before){__dshGuardScript(node);return __dshNativeInsert.call(this,node,before)};
function Chain(value){this.data=value}
Chain.prototype.value=function(){return this.data};
for(var method of ['map','filter','flatMap'])Chain.prototype[method]=function(method){return function(callback){this.data=Array.from(this.data??[])[method](callback);return this}}(method);
Chain.prototype.assign=function(){this.data=Object.assign(this.data,...arguments);return this};
Chain.prototype.sortBy=function(iteratee){var getter=typeof iteratee==='function'?iteratee:function(value){return __dshGet(value,iteratee)};this.data=Array.from(this.data??[]).sort(function(a,b){return String(getter(a)).localeCompare(String(getter(b)))});return this};
Chain.prototype.fromPairs=function(){this.data=Object.fromEntries(this.data);return this};
function lodash(value){return new Chain(value)}
function __dshCollectionValues(value){return Array.isArray(value)?value:Object.values(value??{})}
function __dshIteratee(value){if(typeof value==='function')return value;if(value==null)return function(item){return item};if(Array.isArray(value)&&value.length===2)return function(item){return Object.is(__dshGet(item,value[0]),value[1])};if(__dshPlain(value))return function(item){return Object.entries(value).every(function(pair){return Object.is(__dshGet(item,pair[0]),pair[1])})};return function(item){return __dshGet(item,value)}}
function __dshSortBy(value){var iteratees=Array.prototype.slice.call(arguments,1).flat();if(iteratees.length===0)iteratees=[function(item){return item}];iteratees=iteratees.map(__dshIteratee);return __dshCollectionValues(value).map(function(item,index){return {item:item,index:index,criteria:iteratees.map(function(iteratee){return iteratee(item)})}}).sort(function(left,right){for(var index=0;index<left.criteria.length;index++){var a=left.criteria[index],b=right.criteria[index];if(Object.is(a,b))continue;if(a==null)return 1;if(b==null)return -1;return a>b?1:-1}return left.index-right.index}).map(function(entry){return entry.item})}
function __dshPullAt(array){if(!Array.isArray(array))return [];var indexes=Array.prototype.slice.call(arguments,1).flat().map(function(value){var index=Math.trunc(Number(value));return index<0?array.length+index:index});var removed=indexes.map(function(index){return array[index]});for(var index of Array.from(new Set(indexes)).sort(function(a,b){return b-a}))if(index>=0&&index<array.length)array.splice(index,1);return removed}
function __dshDebounce(func,wait,option){if(typeof func!=='function')throw new TypeError('Expected a function');wait=Math.max(0,Number(wait)||0);option=__dshPlain(option)?option:{};var timer,lastArgs,lastThis,lastCall=0,lastInvoke=0,result;var leading=option.leading===true,trailing=option.trailing!==false,maxing=Number.isFinite(option.maxWait),maxWait=maxing?Math.max(wait,Number(option.maxWait)):0;function invoke(time){var args=lastArgs,receiver=lastThis;lastArgs=lastThis=undefined;lastInvoke=time;result=func.apply(receiver,args);return result}function expire(){var time=Date.now(),sinceCall=time-lastCall,sinceInvoke=time-lastInvoke;if(lastArgs&&(sinceCall<wait||(maxing&&sinceInvoke<maxWait))){var remaining=wait-sinceCall;if(maxing)remaining=Math.min(remaining,maxWait-sinceInvoke);timer=setTimeout(expire,Math.max(0,remaining));return}timer=undefined;if(trailing&&lastArgs)invoke(time);else lastArgs=lastThis=undefined}function debounced(){var time=Date.now(),fresh=timer===undefined;lastArgs=arguments;lastThis=this;lastCall=time;if(fresh){lastInvoke=time;timer=setTimeout(expire,wait);if(leading)return invoke(time)}else if(maxing&&time-lastInvoke>=maxWait){clearTimeout(timer);timer=setTimeout(expire,wait);return invoke(time)}return result}debounced.cancel=function(){clearTimeout(timer);timer=lastArgs=lastThis=undefined;lastCall=lastInvoke=0};debounced.flush=function(){if(timer===undefined)return result;clearTimeout(timer);timer=undefined;if(trailing&&lastArgs)return invoke(Date.now());lastArgs=lastThis=undefined;return result};debounced.pending=function(){return timer!==undefined};return debounced}
Object.assign(lodash,{get:__dshGet,set:__dshSet,has:function(object,path){return __dshGet(object,path,Symbol.for('missing'))!==Symbol.for('missing')},unset:__dshUnset,merge:__dshMerge,assign:Object.assign,cloneDeep:__dshClone,debounce:__dshDebounce,isArray:Array.isArray,isPlainObject:__dshPlain,isEqual:function(a,b){return JSON.stringify(a)===JSON.stringify(b)},clamp:function(value,min,max){return Math.min(max,Math.max(min,Number(value)))},inRange:function(value,start,end){return value>=start&&value<end},range:function(start,end){if(end===undefined){end=start;start=0}return Array.from({length:Math.max(0,end-start)},function(_,i){return start+i})},times:function(count,iteratee){return Array.from({length:count},function(_,i){return iteratee(i)})},constant:function(value){return function(){return value}},keys:Object.keys,values:Object.values,size:function(value){return Array.isArray(value)||typeof value==='string'?value.length:Object.keys(value??{}).length},forEach:function(value,iteratee){Object.entries(value??{}).forEach(function(pair){iteratee(pair[1],pair[0])});return value},pickBy:function(value,predicate){return Object.fromEntries(Object.entries(value??{}).filter(function(pair){return predicate(pair[1],pair[0])}))},pick:function(value,keys){return Object.fromEntries(keys.filter(function(key){return key in value}).map(function(key){return [key,value[key]]}))},omit:function(value,keys){return Object.fromEntries(Object.entries(value??{}).filter(function(pair){return !keys.includes(pair[0])}))},difference:function(left,right){return left.filter(function(value){return !right.includes(value)})},pull:function(array){var values=Array.prototype.slice.call(arguments,1);for(var i=array.length-1;i>=0;i--)if(values.includes(array[i]))array.splice(i,1);return array},toInteger:function(value){var number=Number(value);return Number.isFinite(number)?Math.trunc(number):0}});
Object.assign(lodash,{escape:function(value){return String(value??'').replace(/[&<>"']/g,function(character){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]})},isObject:function(value){return value!==null&&(typeof value==='object'||typeof value==='function')},isDate:function(value){return Object.prototype.toString.call(value)==='[object Date]'},isString:function(value){return typeof value==='string'||value instanceof String},toPath:__dshPath,uniq:function(value){return Array.from(new Set(Array.isArray(value)?value:[]))},concat:function(value){var result=Array.isArray(value)?value.slice():[value];for(var item of Array.prototype.slice.call(arguments,1))Array.isArray(item)?result.push.apply(result,item):result.push(item);return result},remove:function(array,predicate){var removed=[];if(!Array.isArray(array))return removed;for(var index=array.length-1;index>=0;index--)if(predicate(array[index],index,array))removed.unshift(array.splice(index,1)[0]);return removed},intersectionBy:function(){var values=Array.from(arguments);var iteratee=typeof values.at(-1)==='function'?values.pop():function(value){return value};var arrays=values.filter(Array.isArray);if(arrays.length===0)return [];var rest=arrays.slice(1).map(function(array){return new Set(array.map(iteratee))});return arrays[0].filter(function(value,index,array){var key=iteratee(value);return array.findIndex(function(item){return Object.is(iteratee(item),key)})===index&&rest.every(function(keys){return keys.has(key)})})},isEmpty:function(value){if(value==null)return true;if(typeof value==='string'||Array.isArray(value))return value.length===0;if(value instanceof Map||value instanceof Set)return value.size===0;return typeof value==='object'?Object.keys(value).length===0:true},mapValues:function(value,iteratee){return Object.fromEntries(Object.entries(value??{}).map(function(pair){return [pair[0],iteratee(pair[1],pair[0],value)]}))}});
Object.assign(lodash,{sortBy:__dshSortBy,flatMap:function(value,iteratee){iteratee=__dshIteratee(iteratee);return __dshCollectionValues(value).flatMap(function(item,index){return iteratee(item,index,value)})},some:function(value,predicate){predicate=__dshIteratee(predicate);return __dshCollectionValues(value).some(function(item,index){return predicate(item,index,value)})},update:function(object,path,updater){return __dshSet(object,path,updater(__dshGet(object,path)))},isNil:function(value){return value==null},dropRight:function(value,count){value=Array.isArray(value)?value:[];count=count===undefined?1:Math.max(0,Math.trunc(Number(count))||0);return value.slice(0,Math.max(0,value.length-count))},pullAt:__dshPullAt,last:function(value){return Array.isArray(value)?value.at(-1):undefined}});
window._=lodash;
window.SillyTavern.libs.lodash=lodash;
window.SillyTavern.libs.DOMPurify=window.DOMPurify;
window.SillyTavern.libs.Fuse=window.Fuse;
window.SillyTavern.libs.localforage=__dshLocalForageRoot;
function Mini(value){if(value instanceof Mini)this.items=value.items;else if(typeof value==='string'&&value.trim().startsWith('<')){var template=document.createElement('template');template.innerHTML=value.trim();this.items=Array.from(template.content.childNodes)}else if(typeof value==='string')this.items=Array.from(document.querySelectorAll(value));else if(value===window||value===document||value instanceof Node)this.items=[value];else this.items=value&&typeof value.length==='number'?Array.from(value):[]}
Mini.prototype.each=function(callback){this.items.forEach(function(item,index){callback.call(item,index,item)});return this};
Mini.prototype.on=function(type,selector,handler){if(typeof selector==='function'){handler=selector;selector=undefined}return this.each(function(){this.addEventListener(type,function(event){if(selector===undefined)return handler.call(this,event);var target=event.target?.closest?.(selector);if(target&&this.contains(target))handler.call(target,event)})})};
for(var pair of [['text','textContent'],['html','innerHTML'],['val','value']])Mini.prototype[pair[0]]=function(property){return function(value){if(value===undefined)return this.items[0]?.[property]??'';return this.each(function(){this[property]=String(value)})}}(pair[1]);
Mini.prototype.attr=function(name,value){if(value===undefined)return this.items[0]?.getAttribute?.(name);return this.each(function(){this.setAttribute?.(name,String(value))})};
Mini.prototype.prop=function(name,value){if(value===undefined)return this.items[0]?.[name];return this.each(function(){this[name]=value})};
Mini.prototype.css=function(name,value){if(typeof name==='object')return this.each(function(){Object.assign(this.style,name)});if(value===undefined)return this.items[0] instanceof Element?getComputedStyle(this.items[0]).getPropertyValue(name):'';return this.each(function(){this.style?.setProperty(name,String(value))})};
Mini.prototype.append=function(value){var nodes=new Mini(value).items;return this.each(function(){for(var node of nodes)this.append(node.cloneNode(true))})};
Mini.prototype.prepend=function(value){var nodes=new Mini(value).items;return this.each(function(){for(var node of [...nodes].reverse())this.prepend(node.cloneNode(true))})};
Mini.prototype.find=function(selector){return new Mini(this.items.flatMap(function(item){return Array.from(item.querySelectorAll?.(selector)??[])}))};
Mini.prototype.closest=function(selector){return new Mini(this.items.map(function(item){return item.closest?.(selector)}).filter(Boolean))};
Mini.prototype.remove=function(){return this.each(function(){this.remove()})};Mini.prototype.hide=function(){return this.css('display','none')};Mini.prototype.show=function(){return this.css('display','')};
Mini.prototype.addClass=function(value){var names=String(value).split(/\\s+/).filter(Boolean);return this.each(function(){this.classList?.add(...names)})};Mini.prototype.removeClass=function(value){var names=String(value).split(/\\s+/).filter(Boolean);return this.each(function(){this.classList?.remove(...names)})};Mini.prototype.toggleClass=function(value,force){return this.each(function(){this.classList?.toggle(String(value),force)})};
window.$=function(value){if(typeof value==='function'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',value,{once:true});else queueMicrotask(value);return new Mini([])}return new Mini(value)};window.jQuery=window.$;
Object.defineProperty(Mini.prototype,'length',{get:function(){return this.items.length}});
Mini.prototype.empty=function(){return this.each(function(){this.replaceChildren?.()})};
var __dshDisplayedRoots=new Map();
var __dshDisplayedScheduled=new Set();
function __dshReportDisplayed(messageId,root){if(__dshDisplayedScheduled.has(messageId))return;__dshDisplayedScheduled.add(messageId);queueMicrotask(function(){__dshDisplayedScheduled.delete(messageId);if(__dshDisplayedRoots.get(messageId)!==root)return;__dshPost('display-override',{messageId:messageId,value:root.outerHTML})})}
function __dshDisplayedRoot(messageId){var existing=__dshDisplayedRoots.get(messageId);if(existing)return existing;var root=document.createElement('div');root.className='mes_text';root.dataset.dshMessageId=String(messageId);root.innerHTML=__dshDisplayedHtml(__dshMessages[messageId]?.text??'',messageId);__dshFrameHost.appendChild(root);new MutationObserver(function(){__dshReportDisplayed(messageId,root)}).observe(root,{attributes:true,characterData:true,childList:true,subtree:true});__dshDisplayedRoots.set(messageId,root);return root}
window.formatAsDisplayedMessage=function(text,option){var messageId=__dshDisplayedMessageId(option?.message_id);return __dshDisplayedHtml(String(text??''),messageId)};
window.retrieveDisplayedMessage=function(messageId){messageId=__dshDisplayedMessageId(messageId);var result=new Mini(__dshDisplayedRoot(messageId));result.__dshMessageId=messageId;return result};
window.refreshOneMessage=function(messageId,target){var sourceId=__dshDisplayedMessageId(messageId);var targetId=Number.isInteger(target?.__dshMessageId)?target.__dshMessageId:sourceId;var root=__dshDisplayedRoot(targetId);root.innerHTML=__dshDisplayedHtml(__dshMessages[sourceId]?.text??'',sourceId);__dshReportDisplayed(targetId,root);var eventType=__dshMessages[sourceId]?.role==='user'?window.tavern_events.USER_MESSAGE_RENDERED:window.tavern_events.CHARACTER_MESSAGE_RENDERED;return window.eventEmit(eventType,sourceId).then(function(){})};
window.builtin={renderMarkdown:function(value){return __dshMarkdownHtml(value)},saveSettings:__dshSaveSettings};
function __dshToastText(value){if(typeof value==='string')return value;try{return JSON.stringify(value)}catch(error){return String(value)}}
function __dshToast(level,args){var value=Array.from(args).slice(0,2).map(__dshToastText).filter(Boolean).join(' · ').slice(0,8000);(level==='error'?console.error:level==='warning'?console.warn:console.info)(value);if(value)__dshPost('toast',{level:level,value:value});return value}
window.toastr={info:function(){return __dshToast('info',arguments)},success:function(){return __dshToast('success',arguments)},warning:function(){return __dshToast('warning',arguments)},error:function(){return __dshToast('error',arguments)}};
  addEventListener('message',function(event){if(event.source!==parent||!event.data||event.data.source!=='dsh-agent-rp-host')return;var message=event.data;if(message.action==='script-buttons-request'){__dshReportScriptButtons();return}if(message.action==='variables-result'||message.action==='preset-result'||message.action==='model-list-result'||message.action==='popup-result'||message.action==='settings-result'||message.action==='storage-result'){var pending=__dshPending.get(message.requestId);if(!pending)return;__dshPending.delete(message.requestId);message.ok?pending.resolve(message.action==='model-list-result'||message.action==='popup-result'||message.action==='storage-result'?message.value:undefined):pending.reject(new Error(String(message.error??'保存失败')));return}if(message.action==='settings-error'){__dshPost('runtime-error',{value:String(message.error??'酒馆扩展设置保存失败')});return}if(message.action==='extension-settings-sync'&&__dshPlain(message.settings)){for(var key of Object.keys(__dshExtensionSettings))delete __dshExtensionSettings[key];Object.assign(__dshExtensionSettings,__dshClone(message.settings));return}if(message.action==='generation-preview-result'){var pending=__dshPending.get(message.requestId);if(!pending)return;__dshPending.delete(message.requestId);message.ok?pending.resolve(message.value):pending.reject(new Error(String(message.error??'提示词预览失败')));return}if(message.action==='generation-result'){var pending=__dshPending.get(message.requestId);if(!pending)return;__dshPending.delete(message.requestId);if(pending.generationFetch){pending.resolve({ok:message.ok===true,value:message.value,error:message.error});return}message.ok?pending.resolve(String(message.value??'')):pending.reject(new Error(String(message.error??'生成失败')));return}if(message.action==='preset-sync'){__dshPreset=message.preset;return}if(message.action==='variables-sync'){var transcriptChanged=__dshMessageSignature(__dshMessages)!==__dshMessageSignature(message.messages);__dshScopes=message.scopes;__dshMessages=message.messages;__dshCharacterRegexScripts=message.characterRegexScripts??__dshCharacterRegexScripts;__dshGlobalScriptTrees=message.globalScriptTrees??__dshGlobalScriptTrees;__dshPresetScriptTrees=message.presetScriptTrees??__dshPresetScriptTrees;__dshCharacterScriptTrees=message.characterScriptTrees??__dshCharacterScriptTrees;__dshInjectedPrompts=message.injectedPrompts??__dshInjectedPrompts;__dshDisplayRegexScripts=message.displayRegexScripts??__dshDisplayRegexScripts;__dshWorldbooks=message.worldbooks;__dshWorldbookBindings=message.worldbookBindings;__dshActiveWorldbookEntries=message.activeWorldbookEntries??__dshActiveWorldbookEntries;var metadata=__dshChatMetadata();window.SillyTavern.chatMetadata=metadata;window.SillyTavern.chat_metadata=metadata;if(message.preset!==undefined)__dshPreset=message.preset;if(transcriptChanged){for(var root of __dshDisplayedRoots.values())root.remove();__dshDisplayedRoots.clear()}__dshSyncSillyTavernChat();void __dshRefreshInjections();return}if(message.action==='event'){var args=message.args??[];var mutableMvuEvent=message.eventType==='mag_variable_initialized'||message.eventType==='mag_variable_initiailized'||message.eventType==='mag_variable_update_ended';var before=mutableMvuEvent?JSON.stringify(args[0]??{}):undefined;void __dshEmitLocal(message.eventType,args).then(function(){var changed=before!==undefined&&JSON.stringify(args[0]??{})!==before?__dshReplace(args[0]??{},{type:'message'}):undefined;return Promise.resolve(changed).then(function(){if(message.eventType==='generation_ended')__dshConsumeOnceInjections()})}).catch(function(error){console.error(error);__dshPost('runtime-error',{value:String(error)})})}});
addEventListener('error',function(event){__dshPost('runtime-error',{value:event.message})});
addEventListener('unhandledrejection',function(event){__dshPost('runtime-error',{value:String(event.reason)})});
__dshReportScriptButtons();
`;
		}
		/** Create a network-isolated script document from an authorized execution plan. */
		function tavernScriptFrameSource(script, execution, snapshot) {
			const plan = typeof execution === "string" ? {
				source: execution,
				mode: "classic",
				preloads: [],
				needsDomPurify: /\bDOMPurify\b/u.test(execution),
				needsFuse: /\bFuse\b/u.test(execution)
			} : execution;
			const source = plan.source;
			const encoded = safeJson(`${source}\n//# sourceURL=dsh-agent-rp:${script.id}`);
			const origins = [.../* @__PURE__ */ new Set([...BUILT_IN_TAVERN_SCRIPT_ORIGINS, ...snapshot.approvedScriptOrigins])].map((origin) => new URL(origin).origin).join(" ");
			const libraries = [plan.needsDomPurify ? `<script src="${DOMPURIFY_SCRIPT_URL}" integrity="${DOMPURIFY_SCRIPT_INTEGRITY}" crossorigin="anonymous"><\/script>` : "", plan.needsFuse ? `<script src="${FUSE_SCRIPT_URL}" integrity="${FUSE_SCRIPT_INTEGRITY}" crossorigin="anonymous"><\/script>` : ""].join("");
			const preloads = plan.preloads.map((preload) => preload === "zod" ? `import(${safeJson(ZOD_MODULE_URL)}).then(function(module){window.z=module.z??module.default??module})` : `import(${safeJson(YAML_MODULE_URL)}).then(function(module){window.YAML=module.default??module})`);
			const execute = plan.mode === "module" ? `var __dshModuleUrl=URL.createObjectURL(new Blob([${encoded}],{type:'text/javascript'}));try{await import(__dshModuleUrl)}finally{URL.revokeObjectURL(__dshModuleUrl)}` : `Function('localStorage','sessionStorage',${encoded})(__dshLocalStorage,__dshSessionStorage)`;
			const bootstrap = `void (async function(){try{${preloads.length === 0 ? "" : `await Promise.all([${preloads.join(",")}]);`}${execute};__dshPost('ready')}catch(error){console.error(error);__dshPost('runtime-error',{value:String(error)})}})();`;
			return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob: ${origins}; connect-src 'none'; img-src 'none'; style-src 'unsafe-inline'; font-src 'none'; frame-src 'none'">${libraries}<style>html,body{background:transparent;color-scheme:dark}</style></head><body><script>${runtimeSource(snapshot)}\n${bootstrap}<\/script></body></html>`;
		}
		//#endregion
		//#region src/preset-export.ts
		function prompt(prompt) {
			return {
				identifier: prompt.identifier,
				name: prompt.name,
				role: prompt.role,
				content: prompt.content,
				marker: prompt.marker,
				system_prompt: prompt.systemPrompt,
				forbid_overrides: prompt.forbidOverrides,
				...prompt.injectionPosition === void 0 ? {} : { injection_position: prompt.injectionPosition },
				...prompt.injectionDepth === void 0 ? {} : { injection_depth: prompt.injectionDepth },
				...prompt.injectionOrder === void 0 ? {} : { injection_order: prompt.injectionOrder }
			};
		}
		function regex(script) {
			return {
				...script.id === void 0 ? {} : { id: script.id },
				scriptName: script.scriptName,
				findRegex: script.findRegex,
				replaceString: script.replaceString,
				trimStrings: [...script.trimStrings],
				placement: [...script.placement],
				disabled: script.disabled,
				markdownOnly: script.markdownOnly,
				promptOnly: script.promptOnly,
				runOnEdit: script.runOnEdit,
				substituteRegex: script.substituteRegex,
				minDepth: script.minDepth,
				maxDepth: script.maxDepth
			};
		}
		function helperScript(script) {
			return {
				type: "script",
				id: script.id,
				name: script.name,
				content: script.content,
				info: script.info,
				enabled: script.enabled,
				button: {
					enabled: script.buttonEnabled,
					buttons: script.buttons.map((button) => ({ ...button }))
				},
				data: structuredClone(script.data)
			};
		}
		/** Serialize the supported current configuration as a new SillyTavern preset JSON file. */
		function exportSillyTavernPresetJson(preset) {
			const generation = preset.generation;
			const helperScripts = preset.tavernHelperScripts ?? [];
			const helperVariables = preset.tavernHelperVariables ?? {};
			const hasHelper = helperScripts.length > 0 || Object.keys(helperVariables).length > 0;
			return `${JSON.stringify({
				prompts: preset.prompts.map(prompt),
				prompt_order: [{
					character_id: 100001,
					order: preset.order.map((entry) => ({ ...entry }))
				}],
				...generation.temperature === void 0 ? {} : { temperature: generation.temperature },
				...generation.maxTokens === void 0 ? {} : { openai_max_tokens: generation.maxTokens },
				...generation.reasoningEffort === void 0 ? {} : { reasoning_effort: generation.reasoningEffort },
				...generation.topP === void 0 ? {} : { top_p: generation.topP },
				...generation.topK === void 0 ? {} : { top_k: generation.topK },
				...generation.topA === void 0 ? {} : { top_a: generation.topA },
				...generation.minP === void 0 ? {} : { min_p: generation.minP },
				...generation.frequencyPenalty === void 0 ? {} : { frequency_penalty: generation.frequencyPenalty },
				...generation.presencePenalty === void 0 ? {} : { presence_penalty: generation.presencePenalty },
				...generation.repetitionPenalty === void 0 ? {} : { repetition_penalty: generation.repetitionPenalty },
				wi_format: preset.formats.worldInfo,
				scenario_format: preset.formats.scenario,
				personality_format: preset.formats.personality,
				extensions: {
					regex_scripts: preset.regexScripts.map(regex),
					...hasHelper ? { tavern_helper: {
						scripts: helperScripts.map(helperScript),
						variables: structuredClone(helperVariables)
					} } : {}
				}
			}, null, 2)}\n`;
		}
		//#endregion
		//#region src/preset-sections.ts
		const separatorRun = /[-—_=─]{4,}/u;
		const edgeSeparators = /^[-—_=─\s]+|[-—_=─\s]+$/gu;
		/** Returns the display title when a prompt name acts as an author-defined section divider. */
		function presetDividerTitle(name) {
			if (!separatorRun.test(name)) return void 0;
			const title = name.replace(edgeSeparators, "").trim();
			return title === "" ? "未命名分组" : title;
		}
		/** Projects the flat SillyTavern prompt order into collapsible presentation groups. */
		function projectPresetPromptSections(prompts) {
			const grouped = [];
			let current = {
				key: "base",
				title: "基础提示",
				kind: "base",
				prompts: []
			};
			grouped.push(current);
			for (const prompt of prompts) {
				if (!prompt.attached || prompt.imported === false) continue;
				const dividerTitle = presetDividerTitle(prompt.name);
				if (dividerTitle !== void 0) {
					current = {
						key: `section:${prompt.identifier}`,
						title: dividerTitle,
						kind: "named",
						prompts: []
					};
					grouped.push(current);
				}
				current.prompts.push(prompt);
			}
			const custom = prompts.filter((prompt) => prompt.attached && prompt.imported === false);
			if (custom.length > 0) grouped.push({
				key: "custom",
				title: "自定义模块",
				kind: "named",
				prompts: custom
			});
			const detached = prompts.filter((prompt) => !prompt.attached);
			if (detached.length > 0) grouped.push({
				key: "detached",
				title: "未加入当前顺序",
				kind: "detached",
				prompts: detached
			});
			return grouped.filter((section) => section.prompts.length > 0).map((section) => ({
				...section,
				enabledCount: section.prompts.filter((prompt) => prompt.enabled).length
			}));
		}
		//#endregion
		//#region src/preset-library-http-protocol.ts
		/** Same-origin endpoint served by the Agent RP Host plugin. */
		const PRESET_LIBRARY_PATH = "/api/agent-rp/presets";
		/** Disambiguate same-name presets without exposing prompt or script contents. */
		function presetLibraryOptionLabel(entry, entries) {
			if (entries.filter((candidate) => candidate.name === entry.name).length < 2) return entry.name;
			const helper = entry.tavernHelper;
			const missing = helper?.expectedScriptCount === void 0 ? 0 : Math.max(0, helper.expectedScriptCount - helper.scriptCount);
			const state = missing > 0 ? `旧导入，缺 ${missing} 个 TH 脚本` : helper !== void 0 && helper.scriptCount > 0 ? `TH ${helper.enabledScriptCount}/${helper.scriptCount}` : "无 TH 脚本";
			const imported = new Date(entry.updatedAt).toLocaleString("zh-CN", {
				month: "numeric",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false
			});
			return `${entry.name} · ${state} · ${imported}`;
		}
		//#endregion
		//#region src/card-display-compiler.ts
		const HTML_DISPLAY_TAGS = /* @__PURE__ */ new Set([
			"a",
			"abbr",
			"address",
			"area",
			"article",
			"aside",
			"audio",
			"b",
			"base",
			"bdi",
			"bdo",
			"blockquote",
			"body",
			"br",
			"button",
			"canvas",
			"caption",
			"center",
			"cite",
			"code",
			"col",
			"colgroup",
			"data",
			"datalist",
			"dd",
			"del",
			"details",
			"dfn",
			"dialog",
			"div",
			"dl",
			"dt",
			"em",
			"embed",
			"fieldset",
			"figcaption",
			"figure",
			"footer",
			"form",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"head",
			"header",
			"hgroup",
			"hr",
			"html",
			"i",
			"iframe",
			"img",
			"input",
			"ins",
			"kbd",
			"label",
			"legend",
			"li",
			"link",
			"main",
			"map",
			"mark",
			"menu",
			"meta",
			"meter",
			"nav",
			"noscript",
			"object",
			"ol",
			"optgroup",
			"option",
			"output",
			"p",
			"picture",
			"pre",
			"progress",
			"q",
			"rp",
			"rt",
			"ruby",
			"s",
			"samp",
			"script",
			"search",
			"section",
			"select",
			"slot",
			"small",
			"source",
			"span",
			"strong",
			"style",
			"sub",
			"summary",
			"sup",
			"table",
			"tbody",
			"td",
			"template",
			"textarea",
			"tfoot",
			"th",
			"thead",
			"time",
			"title",
			"tr",
			"track",
			"u",
			"ul",
			"var",
			"video",
			"wbr"
		]);
		function stripUnknownTagsOutsideCode(value) {
			let result = "";
			let cursor = 0;
			let codeTicks = 0;
			let removedCount = 0;
			const removedTags = /* @__PURE__ */ new Set();
			while (cursor < value.length) {
				if (value[cursor] === "`") {
					let end = cursor + 1;
					while (value[end] === "`") end += 1;
					const ticks = end - cursor;
					if (codeTicks === 0) codeTicks = ticks;
					else if (ticks === codeTicks) codeTicks = 0;
					result += value.slice(cursor, end);
					cursor = end;
					continue;
				}
				if (codeTicks === 0 && value[cursor] === "<") {
					const tag = value.slice(cursor).match(/^<\/?([A-Za-z][A-Za-z0-9:_-]*)(?:\s[^<>]*?)?\s*\/?>/u);
					const name = tag?.[1]?.toLowerCase();
					if (tag?.[0] !== void 0 && name !== void 0 && !HTML_DISPLAY_TAGS.has(name)) {
						removedCount += 1;
						removedTags.add(name);
						cursor += tag[0].length;
						continue;
					}
				}
				result += value[cursor];
				cursor += 1;
			}
			return {
				text: result,
				removedCount,
				removedTags: [...removedTags].sort()
			};
		}
		function hasDisplayHtmlOutsideCode(value) {
			let cursor = 0;
			let codeTicks = 0;
			while (cursor < value.length) {
				if (value[cursor] === "`") {
					let end = cursor + 1;
					while (value[end] === "`") end += 1;
					const ticks = end - cursor;
					if (codeTicks === 0) codeTicks = ticks;
					else if (ticks === codeTicks) codeTicks = 0;
					cursor = end;
					continue;
				}
				if (codeTicks === 0 && value[cursor] === "<") {
					const name = value.slice(cursor).match(/^<\/?([A-Za-z][A-Za-z0-9:_-]*)(?:\s[^<>]*?)?\s*\/?>/u)?.[1]?.toLowerCase();
					if (name !== void 0 && HTML_DISPLAY_TAGS.has(name)) return true;
				}
				cursor += 1;
			}
			return false;
		}
		function sourceLines(value) {
			const lines = [];
			for (const match of value.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/gu)) {
				const text = match[0];
				const start = match.index;
				if (text === "" && start === value.length) break;
				lines.push({
					start,
					end: start + text.length,
					text
				});
			}
			return lines;
		}
		function normalizeMarkdown(value) {
			let fence;
			let removedCount = 0;
			const removedTags = /* @__PURE__ */ new Set();
			return {
				text: sourceLines(value).map((line) => {
					const candidate = line.text.match(/^ {0,3}(`{3,}|~{3,})/u)?.[1];
					if (candidate !== void 0) {
						if (fence === void 0) fence = {
							marker: candidate[0] ?? "",
							length: candidate.length
						};
						else if (candidate[0] === fence.marker && candidate.length >= fence.length && /^ {0,3}(`{3,}|~{3,})[ \t]*(?:\r\n|\r|\n|$)$/u.test(line.text)) fence = void 0;
						return line.text;
					}
					if (fence !== void 0) return line.text;
					const stripped = stripUnknownTagsOutsideCode(line.text);
					removedCount += stripped.removedCount;
					stripped.removedTags.forEach((tag) => {
						removedTags.add(tag);
					});
					return stripped.text;
				}).join(""),
				removedCount,
				removedTags: [...removedTags].sort()
			};
		}
		function isFrontendDocument(info, source) {
			if (/<!doctype\s+html\b|<html(?:\s|>)/iu.test(source) && /<\/html\s*>/iu.test(source)) return true;
			const language = info.trim().split(/\s+/u)[0]?.toLowerCase();
			if (language !== void 0 && language !== "") return language === "html";
			return /<!doctype\s+html\b|<html(?:\s|>)|<head(?:\s|>)|<body(?:\s|>)/iu.test(source);
		}
		/** Block-level elements whose leading occurrence can be split from following prose. */
		const BLOCK_DISPLAY_TAGS = /* @__PURE__ */ new Set([
			"address",
			"article",
			"aside",
			"blockquote",
			"body",
			"center",
			"details",
			"dialog",
			"div",
			"dl",
			"fieldset",
			"figcaption",
			"figure",
			"footer",
			"form",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"head",
			"header",
			"hgroup",
			"html",
			"main",
			"menu",
			"nav",
			"ol",
			"pre",
			"search",
			"section",
			"summary",
			"table",
			"tbody",
			"td",
			"tfoot",
			"th",
			"thead",
			"tr",
			"ul"
		]);
		const HTML_TAG_PATTERN = /^<(\/?)([A-Za-z][A-Za-z0-9:_-]*)((?:\s[^<>]*?)?)(\/?)>/u;
		/** Return the leading balanced block element and the untouched remainder, if one exists. */
		function splitLeadingHtmlBlock(value) {
			const start = value.search(/\S/u);
			if (start < 0) return void 0;
			const first = HTML_TAG_PATTERN.exec(value.slice(start));
			if (first === null || first[1] === "/" || first[4] === "/") return void 0;
			const name = first[2].toLowerCase();
			if (!BLOCK_DISPLAY_TAGS.has(name)) return void 0;
			let depth = 0;
			let cursor = start;
			while (cursor < value.length) {
				if (value[cursor] !== "<") {
					cursor += 1;
					continue;
				}
				const match = HTML_TAG_PATTERN.exec(value.slice(cursor));
				if (match === null) {
					cursor += 1;
					continue;
				}
				const tag = match[2].toLowerCase();
				const closing = match[1] === "/";
				const selfClosing = match[4] === "/";
				if (!closing && !selfClosing && tag === name) depth += 1;
				if (closing && tag === name) depth = Math.max(0, depth - 1);
				cursor += match[0].length;
				if (depth === 0 && closing) return {
					html: value.slice(0, cursor),
					rest: value.slice(cursor)
				};
			}
		}
		function appendMarkdown(segments, diagnostics, text) {
			const normalized = normalizeMarkdown(text);
			diagnostics.unknownWrapperCount += normalized.removedCount;
			normalized.removedTags.forEach((tag) => {
				diagnostics.unknownWrapperTags.add(tag);
			});
			if (normalized.text === "") return;
			if (hasDisplayHtmlOutsideCode(normalized.text)) {
				const split = splitLeadingHtmlBlock(normalized.text);
				if (split !== void 0 && split.rest.trim() !== "") {
					diagnostics.inlineHtml += 1;
					segments.push({
						kind: "inline-html",
						source: split.html
					});
					appendMarkdown(segments, diagnostics, split.rest);
					return;
				}
				diagnostics.inlineHtml += 1;
				segments.push({
					kind: "inline-html",
					source: normalized.text
				});
				return;
			}
			const previous = segments.at(-1);
			if (previous?.kind === "markdown") {
				segments[segments.length - 1] = {
					kind: "markdown",
					text: previous.text + normalized.text
				};
				return;
			}
			segments.push({
				kind: "markdown",
				text: normalized.text
			});
		}
		/** Compile display output into ordered native-Markdown and isolated-HTML segments. */
		function compileCharacterDisplay(value) {
			const lines = sourceLines(value);
			const segments = [];
			const state = {
				frontendDocuments: 0,
				inlineHtml: 0,
				unknownWrapperCount: 0,
				unknownWrapperTags: /* @__PURE__ */ new Set()
			};
			let cursor = 0;
			for (let index = 0; index < lines.length; index += 1) {
				const line = lines[index];
				if (line === void 0) continue;
				const opening = line.text.match(/^ {0,3}(`{3,}|~{3,})[ \t]*([^\r\n]*?)[ \t]*(?:\r\n|\r|\n|$)$/u);
				if (opening === null) continue;
				const marker = opening[1];
				if (marker === void 0) continue;
				let closingIndex;
				for (let candidate = index + 1; candidate < lines.length; candidate += 1) {
					const closingMarker = (lines[candidate]?.text.match(/^ {0,3}(`{3,}|~{3,})[ \t]*(?:\r\n|\r|\n|$)$/u))?.[1];
					if (closingMarker !== void 0 && closingMarker[0] === marker[0] && closingMarker.length >= marker.length) {
						closingIndex = candidate;
						break;
					}
				}
				if (closingIndex === void 0) break;
				const closing = lines[closingIndex];
				if (closing === void 0) break;
				const source = value.slice(line.end, closing.start);
				if (isFrontendDocument(opening[2] ?? "", source)) {
					appendMarkdown(segments, state, value.slice(cursor, line.start));
					segments.push({
						kind: "html",
						source
					});
					state.frontendDocuments += 1;
					cursor = closing.end;
				}
				index = closingIndex;
			}
			appendMarkdown(segments, state, value.slice(cursor));
			return {
				segments,
				diagnostics: [
					...state.frontendDocuments === 0 ? [] : [{
						code: "frontend-document",
						count: state.frontendDocuments
					}],
					...state.inlineHtml === 0 ? [] : [{
						code: "inline-html",
						count: state.inlineHtml
					}],
					...state.unknownWrapperCount === 0 ? [] : [{
						code: "unknown-wrapper-removed",
						count: state.unknownWrapperCount,
						tags: [...state.unknownWrapperTags].sort()
					}]
				]
			};
		}
		/** Preserve the old block-centering intent using sanitizer-safe HTML. */
		function normalizeLegacyCardHtml(source) {
			const count = [...source.matchAll(/<center(?:\s[^>]*)?>/giu)].length;
			if (count === 0) return {
				source,
				diagnostics: []
			};
			return {
				source: source.replace(/<center(\s[^>]*)?>/giu, "<div data-agent-rp-center$1>").replace(/<\/center\s*>/giu, "</div>"),
				diagnostics: [{
					code: "legacy-center-normalized",
					count
				}]
			};
		}
		/** Split display output while retaining the historical array-only API. */
		function splitCharacterDisplay(value) {
			return [...compileCharacterDisplay(value).segments];
		}
		//#endregion
		//#region src/frontend-regex.ts
		function substituteCardMacros(value, card, userName = "用户", transform = (replacement) => replacement) {
			const name = card.nickname?.trim() || card.name;
			return value.replace(/\{\{char\}\}|<char>|<bot>/giu, transform(name)).replace(/\{\{user\}\}|<user>/giu, transform(userName));
		}
		function compileRegex(value) {
			try {
				const literal = value.match(/^\/([\s\S]*)\/([a-z]*)$/iu);
				if (literal === null) return new RegExp(value);
				const flags = literal[2] ?? "";
				if (flags !== "" && !/^(?!.*?(.).*?\1)[dgimsuvy]+$/u.test(flags)) return new RegExp(value);
				return new RegExp(literal[1] ?? "", flags);
			} catch (_invalidRegex) {
				return;
			}
		}
		/** Describe executable coverage without returning a script expression or replacement. */
		function summarizeCharacterRegexScript(script) {
			const placement = [...new Set(script.placement)];
			const supportedPlacement = placement.filter((value) => value === 1 || value === 2);
			const unsupportedPlacement = placement.filter((value) => value !== 1 && value !== 2);
			const valid = script.findRegex !== "" && compileRegex(script.findRegex) !== void 0;
			const substitutionSupported = [
				0,
				1,
				2
			].includes(Number(script.substituteRegex));
			const state = script.disabled ? "disabled" : !valid ? "invalid" : supportedPlacement.length === 0 ? "unsupported" : unsupportedPlacement.length > 0 || !substitutionSupported ? "partial" : "active";
			return {
				scriptName: script.scriptName,
				enabled: !script.disabled,
				state,
				placement,
				unsupportedPlacement,
				display: script.markdownOnly || !script.markdownOnly && !script.promptOnly,
				prompt: script.promptOnly || !script.markdownOnly && !script.promptOnly,
				runOnEdit: script.runOnEdit,
				minDepth: script.minDepth,
				maxDepth: script.maxDepth
			};
		}
		function escapeRegexMacro(value) {
			return value.replace(/[\n\r\t\v\f\0.^$*+?{}[\]\\/|()]/gu, (character) => {
				switch (character) {
					case "\n": return "\\n";
					case "\r": return "\\r";
					case "	": return "\\t";
					case "\v": return "\\v";
					case "\f": return "\\f";
					case "\0": return "\\0";
					default: return `\\${character}`;
				}
			});
		}
		function substitutedFindRegex(script, card, userName) {
			switch (Number(script.substituteRegex)) {
				case 1: return substituteCardMacros(script.findRegex, card, userName);
				case 2: return substituteCardMacros(script.findRegex, card, userName, escapeRegexMacro);
				default: return script.findRegex;
			}
		}
		function inDepth(script, depth) {
			if (depth === void 0) return true;
			if (script.minDepth !== null && script.minDepth >= -1 && depth < script.minDepth) return false;
			return script.maxDepth === null || script.maxDepth < 0 || depth <= script.maxDepth;
		}
		function filterMatch(value, trimStrings, card, userName) {
			return trimStrings.reduce((text, trim) => text.replaceAll(substituteCardMacros(trim, card, userName), ""), value);
		}
		function applyScript(raw, script, card, userName) {
			return applyScriptWithOutcome(raw, script, card, userName).text;
		}
		function applyScriptWithOutcome(raw, script, card, userName) {
			const find = compileRegex(substitutedFindRegex(script, card, userName));
			if (find === void 0 || script.findRegex === "") return {
				text: raw,
				outcome: "invalid"
			};
			if (raw === "") return {
				text: raw,
				outcome: "no-match"
			};
			let matched = false;
			return {
				text: raw.replace(find, (...args) => {
					matched = true;
					const groups = typeof args.at(-1) === "object" && args.at(-1) !== null ? args.at(-1) : void 0;
					return substituteCardMacros(script.replaceString.replace(/\{\{match\}\}/giu, "$0").replace(/\$(\d+)|\$<([^>]+)>/gu, (_token, numeric, named) => {
						const match = numeric === void 0 ? groups?.[named ?? ""] : args[Number(numeric)];
						return typeof match === "string" ? filterMatch(match, script.trimStrings, card, userName) : "";
					}), card, userName);
				}),
				outcome: matched ? "applied" : "no-match"
			};
		}
		function runScripts(raw, card, placement, view, depth, userName, presetScripts = []) {
			const scripts = [...presetScripts, ...card.frontend.regexScripts];
			const normalized = scripts.reduce((text, script) => {
				if (script.disabled || !script.placement.includes(placement) || !inDepth(script, depth)) return text;
				return !script.markdownOnly && !script.promptOnly ? applyScript(text, script, card, userName) : text;
			}, raw);
			return scripts.reduce((text, script) => {
				if (script.disabled || !script.placement.includes(placement) || !inDepth(script, depth)) return text;
				return (view === "display" ? script.markdownOnly : script.promptOnly) ? applyScript(text, script, card, userName) : text;
			}, normalized);
		}
		function removeVisibleTextToken(value, token) {
			if (token === "") return value;
			let result = "";
			let cursor = 0;
			let index = value.indexOf(token);
			while (index >= 0) {
				result += value.slice(cursor, index);
				const lower = value.toLocaleLowerCase();
				const insideTag = value.lastIndexOf("<", index) > value.lastIndexOf(">", index);
				const insideRawElement = [
					"script",
					"style",
					"template"
				].some((tag) => lower.lastIndexOf(`<${tag}`, index) > lower.lastIndexOf(`</${tag}`, index));
				if (insideTag || insideRawElement) result += token;
				cursor = index + token.length;
				index = value.indexOf(token, cursor);
			}
			return result + value.slice(cursor);
		}
		function stripDisplayOnlyCharacterMediaFields(value, raw) {
			const filenames = [...raw.matchAll(/<角色图片(?:\s[^<>]*?)?>[\s\S]*?<\/角色图片\s*>/giu)].map((match) => match[0]).flatMap((field) => [...field.matchAll(/<img(?:\s[^<>]*?)?>([^<>]*?\.(?:avif|gif|jpe?g|png|webp))<\/img\s*>/giu)].map((match) => match[1]?.trim() ?? "").filter(Boolean));
			let visible = value.replace(/<角色图片(?:\s[^<>]*?)?>([\s\S]*?)<\/角色图片\s*>/giu, (_field, content) => /<img\b[^>]*\bsrc\s*=/iu.test(content) ? content : "");
			for (const filename of new Set(filenames)) visible = removeVisibleTextToken(visible, filename);
			return visible;
		}
		/** Apply character display-only scripts without executing their HTML. */
		function renderCharacterDisplay(raw, card, placement, depth, userName, presetScripts) {
			return stripDisplayOnlyCharacterMediaFields(runScripts(raw, card, placement, "display", depth, userName, presetScripts), raw);
		}
		//#endregion
		//#region src/character-library-protocol.ts
		/** Same-origin endpoint served by the Agent RP Host plugin. */
		const CHARACTER_LIBRARY_PATH = "/api/agent-rp/characters";
		/** Same-origin URL for one validated inert CHARX image. */
		function characterLibraryImageUrl(id, index) {
			return `${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(id)}/images/${index}`;
		}
		//#endregion
		//#region src/client/card-frame.ts
		const cardFrameCompatibility = `<style>
html{background:transparent!important;color-scheme:dark;scrollbar-color:rgba(145,158,181,.58) transparent;scrollbar-width:thin}
*,*::before,*::after{box-sizing:border-box}
[data-agent-rp-center]{display:block;text-align:center}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:999px;background:rgba(145,158,181,.58);background-clip:padding-box}
img,svg,video,canvas{max-width:100%}
</style>`;
		function remoteOrigins(source) {
			const origins = /* @__PURE__ */ new Set();
			for (const match of source.matchAll(/https:\/\/[^\s"'<>`\\)]+/giu)) try {
				const url = new URL(match[0].replace(/[),.;]+$/u, ""));
				if (url.protocol === "https:") origins.add(url.origin);
			} catch {}
			return [...origins].sort();
		}
		function mvuFrameRuntime(statData) {
			return `
var __dshStatData=${JSON.stringify(statData ?? {}).replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029")};
var __dshCardListeners=new Map();
function __dshCardOn(type,listener){var list=__dshCardListeners.get(String(type))??[];list.push(listener);__dshCardListeners.set(String(type),list);var stop=function(){var current=__dshCardListeners.get(String(type))??[];__dshCardListeners.set(String(type),current.filter(function(value){return value!==listener}))};stop.stop=stop;return stop}
function __dshCardEmit(type){var args=Array.prototype.slice.call(arguments,1);for(var listener of [...(__dshCardListeners.get(String(type))??[])]){try{listener.apply(window,args)}catch(error){console.error(error)}}}
window.Mvu={events:{VARIABLE_INITIALIZED:'mag_variable_initialized',VARIABLE_UPDATE_STARTED:'mag_variable_update_started',COMMAND_PARSED:'mag_command_parsed',VARIABLE_UPDATE_ENDED:'mvu-variable-update-ended',BEFORE_MESSAGE_UPDATE:'mag_before_message_update'},getMvuData:function(){return {stat_data:__dshStatData}},replaceMvuData:function(value){__dshStatData=value?.stat_data??value??{};__dshCardEmit('mvu-variable-update-ended',{stat_data:__dshStatData});return Promise.resolve()},isDuringExtraAnalysis:function(){return false}};
window.getAllVariables=function(){return {stat_data:__dshStatData}};
window.waitGlobalInitialized=function(){return Promise.resolve()};
window.eventOn=__dshCardOn;
window.eventOnce=function(type,listener){var control;control=__dshCardOn(type,function(){control.stop();return listener.apply(this,arguments)});return control};
window.eventEmit=__dshCardEmit;
window.errorCatched=function(fn){return function(){try{var value=fn.apply(this,arguments);if(value&&typeof value.catch==='function')value.catch(console.error)}catch(error){console.error(error)}}};
window.toastr={info:function(){},success:function(){},warning:function(){},error:function(){}};
var __dshCardChat=[{message_id:0,message:'',mes:'',name:'角色',is_user:false,role:'assistant',extra:{}}];
window.getChatMessages=function(){return Promise.resolve(__dshCardChat.map(function(message){return Object.assign({},message,{extra:Object.assign({},message.extra)})}))};
window.setChatMessage=function(value,id){var index=Number(id);if(!Number.isSafeInteger(index)||index<0||index>=__dshCardChat.length)index=__dshCardChat.length-1;var text=typeof value==='string'?value:value?.message??value?.mes;if(typeof text==='string'){__dshCardChat[index].message=text;__dshCardChat[index].mes=text;__dshCardEmit('mag_before_message_update',index);__dshCardEmit('mvu-variable-update-ended',{stat_data:__dshStatData})}return Promise.resolve()};
window.SillyTavern={chat:__dshCardChat,name1:'用户',name2:'角色',characters:[],this_chid:0,characterId:0,groups:[],groupId:null,chatMetadata:{},chat_metadata:{},extensionSettings:{},eventSource:{on:window.eventOn,once:window.eventOnce,emit:window.eventEmit},getChatMessages:window.getChatMessages,setChatMessage:window.setChatMessage,getContext:function(){return this}};
window.getContext=function(){return window.SillyTavern.getContext()};
window.TavernHelper=window;
window._={
  get:function(object,path,fallback){var parts=Array.isArray(path)?path:String(path).replace(/^\\./,'').split('.').filter(Boolean);var value=object;for(var i=0;i<parts.length;i++){if(value==null)return fallback;value=value[parts[i]]}return value===undefined?fallback:value},
  clamp:function(value,min,max){return Math.min(max,Math.max(min,Number(value)))},
};
(function(){
  function nodes(value){if(value instanceof Mini)return value.items;if(typeof value==='string'&&value.trim().startsWith('<')){var template=document.createElement('template');template.innerHTML=value.trim();return Array.from(template.content.childNodes)}if(typeof value==='string')return Array.from(document.querySelectorAll(value));if(value===window||value===document||value instanceof Element||value instanceof DocumentFragment)return [value];if(value&&typeof value.length==='number')return Array.from(value);return []}
  function Mini(value){this.items=nodes(value)}
  Mini.prototype.each=function(callback){this.items.forEach(function(item,index){callback.call(item,index,item)});return this};
  Mini.prototype.text=function(value){if(value===undefined)return this.items[0]?.textContent??'';return this.each(function(){this.textContent=String(value)})};
  Mini.prototype.html=function(value){if(value===undefined)return this.items[0]?.innerHTML??'';return this.each(function(){this.innerHTML=String(value)})};
  Mini.prototype.empty=function(){return this.html('')};
  Mini.prototype.val=function(value){if(value===undefined)return this.items[0]?.value??'';return this.each(function(){this.value=value})};
  Mini.prototype.attr=function(name,value){if(value===undefined)return this.items[0]?.getAttribute?.(name);return this.each(function(){this.setAttribute?.(name,String(value))})};
  Mini.prototype.addClass=function(value){var names=String(value).split(/\\s+/).filter(Boolean);return this.each(function(){this.classList?.add(...names)})};
  Mini.prototype.removeClass=function(value){var names=String(value).split(/\\s+/).filter(Boolean);return this.each(function(){this.classList?.remove(...names)})};
  Mini.prototype.toggleClass=function(value,force){return this.each(function(){this.classList?.toggle(String(value),force)})};
  Mini.prototype.on=function(type,selector,handler){if(typeof selector==='function'){handler=selector;selector=undefined}return this.each(function(){this.addEventListener(type,function(event){if(selector===undefined){handler.call(this,event);return}var target=event.target?.closest?.(selector);if(target&&this.contains(target))handler.call(target,event)})})};
  window.$=function(value){if(typeof value==='function'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',value,{once:true});else queueMicrotask(value);return new Mini([])}return new Mini(value)};
})();
`;
		}
		const sandboxFacadeNames = [
			"SillyTavern",
			"Mvu",
			"getAllVariables",
			"waitGlobalInitialized",
			"eventOn",
			"eventOnce",
			"eventEmit",
			"errorCatched",
			"toastr",
			"getChatMessages",
			"setChatMessage",
			"getContext",
			"TavernHelper",
			"_",
			"$"
		];
		function redirectKnownHostFacades(source) {
			return sandboxFacadeNames.reduce((value, name) => {
				const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
				return value.replace(new RegExp(`(?:window\\s*\\.\\s*)?(?:parent|top)\\s*(?:\\?\\.)?\\.?\\s*${escaped}(?![\\w$])`, "gu"), `window.${name}`);
			}, source);
		}
		function cardFrameSource(source, options) {
			const assets = (options.character?.imageAssets ?? []).map((asset) => ({
				...asset,
				url: new URL(characterLibraryImageUrl(options.character.id, asset.index), options.origin).href
			}));
			const adapted = redirectKnownHostFacades(assets.reduce((html, asset) => asset.sourceUri === "" ? html : html.replaceAll(asset.sourceUri, asset.url), source).replaceAll("window.parent?.document ?? window.document", "window.document"));
			const assetJson = JSON.stringify(assets).replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
			const allowedImageOrigins = [.../* @__PURE__ */ new Set([
				options.origin,
				...options.character?.approvedRemoteResourceOrigins ?? [],
				...options.character?.displayExtensions.filter((extension) => extension.enabled).flatMap((extension) => extension.remoteImageOrigins) ?? []
			])].map((origin) => origin.replace(/["'<>\s]/gu, "")).filter(Boolean).join(" ");
			const textColor = (options.textColor ?? "rgb(242, 238, 232)").replace(/[<>&"']/gu, "");
			const interactiveOrigins = (options.character?.approvedRemoteResourceOrigins ?? []).map((origin) => origin.replace(/["'<>\s]/gu, "")).filter(Boolean).join(" ");
			const remotePolicy = interactiveOrigins === "" ? "'none'" : interactiveOrigins;
			const head = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob: ${allowedImageOrigins}; style-src 'unsafe-inline' ${interactiveOrigins}; script-src 'unsafe-inline' ${interactiveOrigins}; connect-src ${remotePolicy}; font-src ${remotePolicy}; frame-src 'none';"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1">${cardFrameCompatibility}<style>body{color:${textColor}}</style><script>${mvuFrameRuntime(options.statData)}window.dshCharacterAssets=Object.freeze(${assetJson}.map(Object.freeze));window.getCharacterAsset=function(type,name){var target=window.dshCharacterAssets.find(function(asset){return asset.type===String(type).toLowerCase()&&(name===undefined||asset.name===String(name))});return target?.url};window.triggerSlash=function(value){parent.postMessage({source:'dsh-agent-rp-card',action:'trigger-slash',value:String(value)},'*')};function __dshReportSize(){var root=document.documentElement;var body=document.body;var viewport=Math.max(0,window.innerHeight||0);var overflow=Math.max(root?root.scrollHeight:0,body?body.scrollHeight:0);var contentBottom=0;if(body){for(var child of body.children){if(child.hidden||child.tagName==='SCRIPT'||child.tagName==='STYLE'||getComputedStyle(child).position==='fixed')continue;var rect=child.getBoundingClientRect();contentBottom=Math.max(contentBottom,rect.bottom+window.scrollY)}var marginBottom=parseFloat(getComputedStyle(body).marginBottom);if(Number.isFinite(marginBottom))contentBottom+=marginBottom}var value=Math.max(contentBottom,overflow>viewport+1?overflow:0);parent.postMessage({source:'dsh-agent-rp-card',action:'resize',value:value},'*')}addEventListener('message',function(event){var message=event.data;if(message&&message.source==='dsh-agent-rp-host'&&message.action==='request-resize')requestAnimationFrame(__dshReportSize)});addEventListener('DOMContentLoaded',function(){var input=document.getElementById('send_textarea');if(!input){input=document.createElement('textarea');input.id='send_textarea';input.hidden=true;document.body.appendChild(input)}input.addEventListener('input',function(){parent.postMessage({source:'dsh-agent-rp-card',action:'draft',value:input.value},'*')});requestAnimationFrame(__dshReportSize);if(window.ResizeObserver)new ResizeObserver(__dshReportSize).observe(document.documentElement)});<\/script>`;
			if (/<head(?:\s|>)/iu.test(adapted)) return adapted.replace(/<head([^>]*)>/iu, `<head$1>${head}`);
			if (/<html(?:\s|>)/iu.test(adapted)) return adapted.replace(/<html([^>]*)>/iu, `<html$1><head>${head}</head>`);
			return `<!doctype html><html><head>${head}</head><body>${adapted}</body></html>`;
		}
		/** Wrap one already-isolated frontend document with the shared sandbox runtime. */
		function compileCardFrameDocument(source, options) {
			return cardFrameSource(source, options);
		}
		function inlineCardFrameSource(source, options) {
			const legacy = normalizeLegacyCardHtml(source);
			let markup = legacy.source;
			if (!/^\s*</u.test(markup)) try {
				markup = k$1.parse(markup, {
					async: false,
					breaks: true,
					gfm: true
				});
			} catch {}
			return {
				srcDoc: cardFrameSource(purify.sanitize(markup, {
					ADD_TAGS: ["style"],
					FORBID_ATTR: ["srcdoc"],
					FORBID_TAGS: [
						"base",
						"embed",
						"form",
						"iframe",
						"link",
						"meta",
						"object",
						"script"
					],
					USE_PROFILES: { html: true },
					WHOLE_DOCUMENT: true
				}), options),
				diagnostics: legacy.diagnostics
			};
		}
		/** Compile deterministic display segments into browser-ready Markdown and iframe documents. */
		function compileCardFrames(compilation, options) {
			const diagnostics = [...compilation.diagnostics];
			return {
				segments: compilation.segments.map((segment) => {
					if (segment.kind === "markdown") return segment;
					if (segment.kind === "html") return {
						kind: "frame",
						sourceKind: segment.kind,
						srcDoc: cardFrameSource(segment.source, options),
						interactive: /<script\b|\bfetch\s*\(|\bon[a-z]+\s*=/iu.test(segment.source),
						remoteOrigins: remoteOrigins(segment.source)
					};
					const compiled = inlineCardFrameSource(segment.source, options);
					diagnostics.push(...compiled.diagnostics);
					return {
						kind: "frame",
						sourceKind: segment.kind,
						srcDoc: compiled.srcDoc,
						interactive: false,
						remoteOrigins: remoteOrigins(segment.source)
					};
				}),
				diagnostics
			};
		}
		/** Serialize diagnostics for DOM inspection without retaining card text. */
		function cardFrameDiagnosticSummary(diagnostics) {
			if (diagnostics.length === 0) return void 0;
			return diagnostics.map((value) => `${value.code}:${value.count}`).join(",");
		}
		//#endregion
		//#region src/client/import-hint.ts
		/**
		* Classify one standalone draft without inspecting or executing its contents.
		* @param attachments - ordered browser-only draft attachments.
		* @returns filename-based migration affordance, when unambiguous enough to offer a choice.
		*/
		function selectSillyTavernDraft(attachments) {
			if (attachments.length === 2) {
				const card = attachments.find((attachment) => attachment.kind === "file" && /\.json$/iu.test(attachment.file.name.trim()) || attachment.kind === "file" && /\.charx$/iu.test(attachment.file.name.trim()) || attachment.kind === "image" && /\.png$/iu.test(attachment.file.name.trim()));
				const chat = attachments.find((attachment) => attachment.kind === "file" && /\.jsonl$/iu.test(attachment.file.name.trim()));
				if (card !== void 0 && chat !== void 0) return {
					kind: "migration",
					name: `${card.file.name.trim()} + ${chat.file.name.trim()}`
				};
				return;
			}
			if (attachments.length !== 1) return void 0;
			const attachment = attachments[0];
			if (attachment === void 0) return void 0;
			const name = attachment.file.name.trim();
			if (name === "") return void 0;
			if (attachment.kind === "file" && /\.jsonl$/iu.test(name)) return {
				kind: "chat",
				name
			};
			if (attachment.kind === "file" && /\.json$/iu.test(name)) return {
				kind: "json-resource",
				name
			};
			if (attachment.kind === "file" && /\.charx$/iu.test(name)) return {
				kind: "character-card",
				name
			};
			if (attachment.kind === "image" && /\.png$/iu.test(name)) return {
				kind: "png-candidate",
				name
			};
		}
		//#endregion
		//#region src/client/tavern-slash.ts
		/**
		* Parse the small slash-command subset used by imported Tavern interfaces.
		*
		* @param value - Raw command passed to Tavern Helper's `triggerSlash` API.
		* @returns The supported command, or `undefined` when Agent RP does not implement it.
		*/
		function parseTavernSlashCommand(value) {
			if (/^\/trigger\s*$/iu.test(value)) return { kind: "trigger" };
			const piped = value.match(/^\/(send|setinput)\s+([\s\S]*?)\s*\|{1,2}\s*\/trigger\s*$/iu);
			if (piped?.[1] !== void 0 && piped[2] !== void 0) return piped[1].toLowerCase() === "send" ? {
				kind: "send",
				text: piped[2]
			} : {
				kind: "set-input",
				text: piped[2],
				trigger: true
			};
			const direct = value.match(/^\/(send|setinput)\s+([\s\S]*)$/iu);
			if (direct?.[1] === void 0 || direct[2] === void 0) return void 0;
			return direct[1].toLowerCase() === "send" ? {
				kind: "send",
				text: direct[2]
			} : {
				kind: "set-input",
				text: direct[2],
				trigger: false
			};
		}
		//#endregion
		//#region src/client/tavern-storage.ts
		/** Host-owned IndexedDB storage for isolated SillyTavern script sandboxes. */
		const DATABASE_NAME = "dsh-agent-rp-tavern-storage";
		const DATABASE_VERSION = 1;
		const STORE_NAME = "entries";
		let database;
		function openDatabase() {
			if (database !== void 0) return database;
			database = new Promise((resolve, reject) => {
				const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
				request.addEventListener("upgradeneeded", () => {
					request.result.createObjectStore(STORE_NAME, { keyPath: ["namespace", "key"] }).createIndex("namespace", "namespace", { unique: false });
				});
				request.addEventListener("success", () => {
					resolve(request.result);
				});
				request.addEventListener("error", () => {
					reject(request.error ?? /* @__PURE__ */ new Error("无法打开酒馆脚本存储"));
				});
				request.addEventListener("blocked", () => {
					reject(/* @__PURE__ */ new Error("酒馆脚本存储正在被另一个页面升级"));
				});
			}).catch((reason) => {
				database = void 0;
				throw reason;
			});
			return database;
		}
		function result(request) {
			return new Promise((resolve, reject) => {
				request.addEventListener("success", () => {
					resolve(request.result);
				});
				request.addEventListener("error", () => {
					reject(request.error ?? /* @__PURE__ */ new Error("酒馆脚本存储操作失败"));
				});
			});
		}
		function completed(transaction) {
			return new Promise((resolve, reject) => {
				transaction.addEventListener("complete", () => {
					resolve();
				});
				transaction.addEventListener("abort", () => {
					reject(transaction.error ?? /* @__PURE__ */ new Error("酒馆脚本存储事务已取消"));
				});
				transaction.addEventListener("error", () => {
					reject(transaction.error ?? /* @__PURE__ */ new Error("酒馆脚本存储事务失败"));
				});
			});
		}
		function key(value) {
			if (typeof value !== "string" || value.length === 0 || value.length > 2048) throw new Error("酒馆脚本存储键必须是 1–2048 个字符");
			return value;
		}
		function namespace(value) {
			if (typeof value !== "string" || value.length === 0 || value.length > 512) throw new Error("酒馆脚本存储命名空间无效");
			return value;
		}
		async function entries(store, name) {
			return await result(store.index("namespace").getAll(IDBKeyRange.only(name)));
		}
		/** Execute one localforage-compatible request against Host IndexedDB. */
		async function executeTavernStorageRequest(request) {
			const name = namespace(request.namespace);
			const db = await openDatabase();
			if (request.operation === "get") return (await result(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get([name, key(request.key)])))?.value ?? null;
			if (request.operation === "set") {
				const itemKey = key(request.key);
				const transaction = db.transaction(STORE_NAME, "readwrite");
				transaction.objectStore(STORE_NAME).put({
					namespace: name,
					key: itemKey,
					value: request.value ?? null
				});
				await completed(transaction);
				return request.value ?? null;
			}
			if (request.operation === "remove") {
				const transaction = db.transaction(STORE_NAME, "readwrite");
				transaction.objectStore(STORE_NAME).delete([name, key(request.key)]);
				await completed(transaction);
				return;
			}
			if (request.operation === "clear") {
				const values = await entries(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME), name);
				const write = db.transaction(STORE_NAME, "readwrite");
				const store = write.objectStore(STORE_NAME);
				for (const value of values) store.delete([name, value.key]);
				await completed(write);
				return;
			}
			const keys = (await entries(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME), name)).map((value) => value.key);
			if (request.operation === "keys") return keys;
			if (request.operation === "length") return keys.length;
			if (!Number.isSafeInteger(request.index) || Number(request.index) < 0) return null;
			return keys[Number(request.index)] ?? null;
		}
		//#endregion
		//#region src/persona-library-protocol.ts
		/** Browser-safe values shared by the local Persona library and Roleplay UI. */
		/** Same-origin endpoint served by the Agent RP Host plugin. */
		const PERSONA_LIBRARY_PATH = "/api/agent-rp/personas";
		//#endregion
		//#region src/sillytavern-chat-protocol.ts
		/** Browser-safe values for model-free SillyTavern chat migration. */
		/** Same-origin upload endpoint served by the Agent RP Host plugin. */
		const SILLYTAVERN_CHAT_PATH = "/api/agent-rp/sillytavern-chats";
		//#endregion
		//#region src/sillytavern-chat-export-protocol.ts
		/** Same-origin download endpoint for the active Roleplay transcript. */
		const SILLYTAVERN_CHAT_EXPORT_PATH = "/api/agent-rp/sillytavern-chat-export";
		//#endregion
		//#region src/memory-protocol.ts
		/** Same-origin endpoint exposing only the currently active memory snapshot. */
		const AGENT_RP_MEMORY_PATH = "/api/agent-rp/memory";
		//#endregion
		//#region src/session-launch-protocol.ts
		/** Same-origin endpoint that creates one complete roleplay Session. */
		const AGENT_RP_SESSION_PATH = "/api/agent-rp/sessions";
		//#endregion
		//#region src/world-info-library-protocol.ts
		/** Same-origin upload endpoint served by the Agent RP Host plugin. */
		const WORLD_INFO_LIBRARY_PATH = "/api/agent-rp/world-info";
		//#endregion
		//#region node_modules/.pnpm/@deepseek-ai+cosmokit@1.8.2/node_modules/@deepseek-ai/cosmokit/lib/index.js
		/** Return true when a value is `null` or `undefined`. */
		function isNullable(value) {
			return value === null || value === void 0;
		}
		/** Return true for non-array object values. */
		function isPlainObject(data) {
			return data && typeof data === "object" && !Array.isArray(data);
		}
		/** Filter object entries and return a new object. */
		function filterKeys(object, filter) {
			return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
		}
		/** Map object values while preserving the original key set. */
		function mapValues(object, transform) {
			return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
		}
		/** Pick selected keys from an object, optionally including `undefined` values. */
		function pick(source, keys, forced) {
			if (!keys) return { ...source };
			const result = {};
			for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
			return result;
		}
		/** Test values using `instanceof` with a `toStringTag` fallback. */
		function is(type, value) {
			if (arguments.length === 1) return (value) => is(type, value);
			return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
		}
		function isArrayBufferLike(value) {
			return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
		}
		function isArrayBufferSource(value) {
			return isArrayBufferLike(value) || ArrayBuffer.isView(value);
		}
		/** Binary source detection and base64/hex conversion helpers. */
		var Binary;
		(function(Binary) {
			Binary.is = isArrayBufferLike;
			Binary.isSource = isArrayBufferSource;
			function fromSource(source) {
				if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
				else return source;
			}
			Binary.fromSource = fromSource;
			function toBase64(source) {
				source = fromSource(source);
				if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
				let binary = "";
				const bytes = new Uint8Array(source);
				for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
				return btoa(binary);
			}
			Binary.toBase64 = toBase64;
			function fromBase64(source) {
				if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
				return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
			}
			Binary.fromBase64 = fromBase64;
			function toHex(source) {
				source = fromSource(source);
				if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
				return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
			}
			Binary.toHex = toHex;
			function fromHex(source) {
				if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
				const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
				const buffer = [];
				for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
				return Uint8Array.from(buffer).buffer;
			}
			Binary.fromHex = fromHex;
		})(Binary || (Binary = {}));
		Binary.fromBase64;
		Binary.toBase64;
		Binary.fromHex;
		Binary.toHex;
		/** Deep-clone common JavaScript values while preserving prototypes and cycles. */
		function clone(source, refs = /* @__PURE__ */ new Map()) {
			if (!source || typeof source !== "object") return source;
			if (is("Date", source)) return new Date(source.valueOf());
			if (is("RegExp", source)) return new RegExp(source.source, source.flags);
			if (isArrayBufferLike(source)) return source.slice(0);
			if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
			const cached = refs.get(source);
			if (cached) return cached;
			if (Array.isArray(source)) {
				const result = [];
				refs.set(source, result);
				source.forEach((value, index) => {
					result[index] = Reflect.apply(clone, null, [value, refs]);
				});
				return result;
			}
			const result = Object.create(Object.getPrototypeOf(source));
			refs.set(source, result);
			for (const key of Reflect.ownKeys(source)) {
				const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
				if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
				Reflect.defineProperty(result, key, descriptor);
			}
			return result;
		}
		/** Deeply compare arrays, dates, regexps, buffers, and plain object fields. */
		function deepEqual(a, b, strict) {
			if (a === b) return true;
			if (!strict && isNullable(a) && isNullable(b)) return true;
			if (typeof a !== typeof b) return false;
			if (typeof a !== "object") return false;
			if (!a || !b) return false;
			function check(test, then) {
				return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
			}
			return check(Array.isArray, (a, b) => a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))) ?? check(is("Date"), (a, b) => a.valueOf() === b.valueOf()) ?? check(is("RegExp"), (a, b) => a.source === b.source && a.flags === b.flags) ?? check(isArrayBufferLike, (a, b) => {
				if (a.byteLength !== b.byteLength) return false;
				const viewA = new Uint8Array(a);
				const viewB = new Uint8Array(b);
				for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
				return true;
			}) ?? Object.keys({
				...a,
				...b
			}).every((key) => deepEqual(a[key], b[key], strict));
		}
		/** Time constants plus parsing and formatting helpers. */
		var Time;
		(function(Time) {
			Time.millisecond = 1;
			Time.second = 1e3;
			Time.minute = Time.second * 60;
			Time.hour = Time.minute * 60;
			Time.day = Time.hour * 24;
			Time.week = Time.day * 7;
			let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
			function setTimezoneOffset(offset) {
				timezoneOffset = offset;
			}
			Time.setTimezoneOffset = setTimezoneOffset;
			function getTimezoneOffset() {
				return timezoneOffset;
			}
			Time.getTimezoneOffset = getTimezoneOffset;
			function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
				if (typeof date === "number") date = new Date(date);
				if (offset === void 0) offset = timezoneOffset;
				return Math.floor((date.valueOf() / Time.minute - offset) / 1440);
			}
			Time.getDateNumber = getDateNumber;
			function fromDateNumber(value, offset) {
				const date = new Date(value * Time.day);
				if (offset === void 0) offset = timezoneOffset;
				return new Date(+date + offset * Time.minute);
			}
			Time.fromDateNumber = fromDateNumber;
			const numeric = /\d+(?:\.\d+)?/.source;
			const timeRegExp = new RegExp(`^${[
				"w(?:eek(?:s)?)?",
				"d(?:ay(?:s)?)?",
				"h(?:our(?:s)?)?",
				"m(?:in(?:ute)?(?:s)?)?",
				"s(?:ec(?:ond)?(?:s)?)?"
			].map((unit) => `(${numeric}${unit})?`).join("")}$`);
			function parseTime(source) {
				const capture = timeRegExp.exec(source);
				if (!capture) return 0;
				return (parseFloat(capture[1]) * Time.week || 0) + (parseFloat(capture[2]) * Time.day || 0) + (parseFloat(capture[3]) * Time.hour || 0) + (parseFloat(capture[4]) * Time.minute || 0) + (parseFloat(capture[5]) * Time.second || 0);
			}
			Time.parseTime = parseTime;
			function parseDate(date) {
				const parsed = parseTime(date);
				if (parsed) date = Date.now() + parsed;
				else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
				else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
				return date ? new Date(date) : /* @__PURE__ */ new Date();
			}
			Time.parseDate = parseDate;
			function format(ms) {
				const abs = Math.abs(ms);
				if (abs >= Time.day - Time.hour / 2) return Math.round(ms / Time.day) + "d";
				else if (abs >= Time.hour - Time.minute / 2) return Math.round(ms / Time.hour) + "h";
				else if (abs >= Time.minute - Time.second / 2) return Math.round(ms / Time.minute) + "m";
				else if (abs >= Time.second) return Math.round(ms / Time.second) + "s";
				return ms + "ms";
			}
			Time.format = format;
			function toDigits(source, length = 2) {
				return source.toString().padStart(length, "0");
			}
			Time.toDigits = toDigits;
			function template(template, time = /* @__PURE__ */ new Date()) {
				return template.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
			}
			Time.template = template;
		})(Time || (Time = {}));
		//#endregion
		//#region node_modules/.pnpm/@deepseek-ai+schemastery@3.18.1/node_modules/@deepseek-ai/schemastery/lib/index.mjs
		const kSchema = Symbol.for("schemastery");
		const kValidationError = Symbol.for("ValidationError");
		globalThis.__schemastery_index__ ??= 0;
		globalThis.__schemastery_refs__ = void 0;
		var ValidationError = class extends TypeError {
			options;
			name = "ValidationError";
			constructor(message, options) {
				let prefix = "$";
				for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
				else if (typeof segment === "number") prefix += "[" + segment + "]";
				else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
				if (prefix.startsWith(".")) prefix = prefix.slice(1);
				super((prefix === "$" ? "" : `${prefix} `) + message);
				this.options = options;
			}
			static is(error) {
				return !!error?.[kValidationError];
			}
		};
		Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
		const Schema = function(options) {
			const schema = function(data, options = {}) {
				return Schema.resolve(data, schema, options)[0];
			};
			if (options.refs) {
				const refs = mapValues(options.refs, (options) => new Schema(options));
				const getRef = (uid) => refs[uid];
				for (const key in refs) {
					const options = refs[key];
					options.sKey = getRef(options.sKey);
					options.inner = getRef(options.inner);
					options.list = options.list && options.list.map(getRef);
					options.dict = options.dict && mapValues(options.dict, getRef);
				}
				return refs[options.uid];
			}
			Object.assign(schema, options);
			if (typeof schema.callback === "string") try {
				schema.callback = new Function("return " + schema.callback)();
			} catch {}
			Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
			Object.setPrototypeOf(schema, Schema.prototype);
			schema.meta ||= {};
			schema.toString = schema.toString.bind(schema);
			return schema;
		};
		Schema.prototype = Object.create(Function.prototype);
		Schema.prototype[kSchema] = true;
		Object.defineProperty(Schema.prototype, "~standard", { get() {
			return {
				version: 1,
				vendor: "schemastery",
				validate: (value) => {
					try {
						return { value: Schema.resolve(value, this, {})[0] };
					} catch (error) {
						if (ValidationError.is(error)) return { issues: [{
							message: error.message,
							path: error.options.path
						}] };
						throw error;
					}
				}
			};
		} });
		Schema.ValidationError = ValidationError;
		Schema.prototype.toJSON = function toJSON() {
			if (globalThis.__schemastery_refs__) {
				globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
				return this.uid;
			}
			globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
			globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
			const result = {
				uid: this.uid,
				refs: globalThis.__schemastery_refs__
			};
			globalThis.__schemastery_refs__ = void 0;
			return result;
		};
		Schema.prototype.set = function set(key, value) {
			this.dict[key] = value;
			return this;
		};
		Schema.prototype.push = function push(value) {
			this.list.push(value);
			return this;
		};
		function mergeDesc(original, messages) {
			const result = typeof original === "string" ? { "": original } : { ...original };
			for (const locale in messages) {
				const value = messages[locale];
				if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
				else if (typeof value === "string") result[locale] = value;
			}
			return result;
		}
		function getInner(value) {
			return value?.$value ?? value?.$inner;
		}
		function extractKeys(data) {
			return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
		}
		Schema.prototype.i18n = function i18n(messages) {
			const schema = Schema(this);
			const desc = mergeDesc(schema.meta.description, messages);
			if (Object.keys(desc).length) schema.meta.description = desc;
			if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
				return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
			});
			if (schema.list) schema.list = schema.list.map((inner, index) => {
				return inner.i18n(mapValues(messages, (data = {}) => {
					if (Array.isArray(getInner(data))) return getInner(data)[index];
					if (Array.isArray(data)) return data[index];
					return extractKeys(data);
				}));
			});
			if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
				if (getInner(data)) return getInner(data);
				return extractKeys(data);
			}));
			if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
			return schema;
		};
		Schema.prototype.extra = function extra(key, value) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				[key]: value
			};
			return schema;
		};
		for (const key of [
			"required",
			"disabled",
			"collapse",
			"hidden",
			"loose"
		]) Object.assign(Schema.prototype, { [key](value = true) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				[key]: value
			};
			return schema;
		} });
		Schema.prototype.deprecated = function deprecated() {
			const schema = Schema(this);
			schema.meta.badges ||= [];
			schema.meta.badges.push({
				text: "deprecated",
				type: "danger"
			});
			return schema;
		};
		Schema.prototype.experimental = function experimental() {
			const schema = Schema(this);
			schema.meta.badges ||= [];
			schema.meta.badges.push({
				text: "experimental",
				type: "warning"
			});
			return schema;
		};
		Schema.prototype.pattern = function pattern(regexp) {
			const schema = Schema(this);
			const pattern = pick(regexp, ["source", "flags"]);
			schema.meta = {
				...schema.meta,
				pattern
			};
			return schema;
		};
		Schema.prototype.simplify = function simplify(value) {
			if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
			if (isNullable(value)) return value;
			if (this.type === "object" || this.type === "dict") {
				const result = {};
				for (const key in value) {
					const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
					if (this.type === "dict" || !isNullable(item)) result[key] = item;
				}
				if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
				return result;
			} else if (this.type === "array" || this.type === "tuple") {
				const result = [];
				value.forEach((value, index) => {
					const schema = this.type === "array" ? this.inner : this.list[index];
					const item = schema ? schema.simplify(value) : value;
					result.push(item);
				});
				return result;
			} else if (this.type === "intersect") {
				const result = {};
				for (const item of this.list) Object.assign(result, item.simplify(value));
				return result;
			} else if (this.type === "union") for (const schema of this.list) try {
				Schema.resolve(value, schema, {});
				return schema.simplify(value);
			} catch {}
			return value;
		};
		Schema.prototype.toString = function toString(inline) {
			return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
		};
		Schema.prototype.role = function role(role, extra) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				role,
				extra
			};
			return schema;
		};
		for (const key of [
			"default",
			"link",
			"comment",
			"description",
			"max",
			"min",
			"step"
		]) Object.assign(Schema.prototype, { [key](value) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				[key]: value
			};
			return schema;
		} });
		const resolvers = {};
		Schema.extend = function extend(type, resolve) {
			resolvers[type] = resolve;
		};
		Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
			if (!schema) return [data];
			if (options.ignore?.(data, schema)) return [data];
			if (isNullable(data) && schema.type !== "lazy") {
				if (schema.meta.required) throw new ValidationError(`missing required value`, options);
				let current = schema;
				let fallback = schema.meta.default;
				while (current?.type === "intersect" && isNullable(fallback)) {
					current = current.list[0];
					fallback = current?.meta.default;
				}
				if (isNullable(fallback)) return [data];
				data = clone(fallback);
			}
			const callback = resolvers[schema.type];
			if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
			try {
				return callback(data, schema, options, strict);
			} catch (error) {
				if (!schema.meta.loose) throw error;
				return [schema.meta.default];
			}
		};
		Schema.from = function from(source) {
			if (isNullable(source)) return Schema.any();
			else if ([
				"string",
				"number",
				"boolean"
			].includes(typeof source)) return Schema.const(source).required();
			else if (source[kSchema]) return source;
			else if (typeof source === "function") switch (source) {
				case String: return Schema.string().required();
				case Number: return Schema.number().required();
				case Boolean: return Schema.boolean().required();
				case Function: return Schema.function().required();
				default: return Schema.is(source).required();
			}
			else throw new TypeError(`cannot infer schema from ${source}`);
		};
		Schema.lazy = function lazy(builder) {
			const toJSON = () => {
				if (!schema.inner[kSchema]) {
					schema.inner = schema.builder();
					schema.inner.meta = {
						...schema.meta,
						...schema.inner.meta
					};
				}
				return schema.inner.toJSON();
			};
			const schema = new Schema({
				type: "lazy",
				builder,
				inner: { toJSON }
			});
			return schema;
		};
		Schema.natural = function natural() {
			return Schema.number().step(1).min(0);
		};
		Schema.percent = function percent() {
			return Schema.number().step(.01).min(0).max(1).role("slider");
		};
		Schema.date = function date() {
			return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
				const date = new Date(value);
				if (isNaN(+date)) throw new ValidationError(`invalid date "${value}"`, options);
				return date;
			}, true)]);
		};
		Schema.regExp = function regExp(flag = "") {
			return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
				try {
					return new RegExp(value, flag);
				} catch (e) {
					throw new ValidationError(e.message, options);
				}
			}, true)]);
		};
		Schema.arrayBuffer = function arrayBuffer(encoding) {
			return Schema.union([
				Schema.is(ArrayBuffer),
				Schema.is(SharedArrayBuffer),
				Schema.transform(Schema.any(), (value, options) => {
					if (Binary.isSource(value)) return Binary.fromSource(value);
					throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
				}, true),
				...encoding ? [Schema.transform(Schema.string(), (value, options) => {
					try {
						return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
					} catch (e) {
						throw new ValidationError(e.message, options);
					}
				}, true)] : []
			]);
		};
		Schema.extend("lazy", (data, schema, options, strict) => {
			if (!schema.inner[kSchema]) {
				schema.inner = schema.builder();
				schema.inner.meta = {
					...schema.meta,
					...schema.inner.meta
				};
			}
			return Schema.resolve(data, schema.inner, options, strict);
		});
		Schema.extend("any", (data) => {
			return [data];
		});
		Schema.extend("never", (data, _, options) => {
			throw new ValidationError(`expected nullable but got ${data}`, options);
		});
		Schema.extend("const", (data, { value }, options) => {
			if (deepEqual(data, value)) return [value];
			throw new ValidationError(`expected ${value} but got ${data}`, options);
		});
		function checkWithinRange(data, meta, description, options, skipMin = false) {
			const { max = Infinity, min = -Infinity } = meta;
			if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
			if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
		}
		Schema.extend("string", (data, { meta }, options) => {
			if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
			if (meta.pattern) {
				const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
				if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
			}
			checkWithinRange(data.length, meta, "string length", options);
			return [data];
		});
		function decimalShift(data, digits) {
			const str = data.toString();
			if (str.includes("e")) return data * Math.pow(10, digits);
			const index = str.indexOf(".");
			if (index === -1) return data * Math.pow(10, digits);
			const frac = str.slice(index + 1);
			const integer = str.slice(0, index);
			if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
			return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
		}
		function isMultipleOf(data, min, step) {
			step = Math.abs(step);
			if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
			const index = step.toString().indexOf(".");
			const digits = step.toString().slice(index + 1).length;
			return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
		}
		Schema.extend("number", (data, { meta }, options) => {
			if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
			checkWithinRange(data, meta, "number", options);
			const { step } = meta;
			if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
			return [data];
		});
		Schema.extend("boolean", (data, _, options) => {
			if (typeof data === "boolean") return [data];
			throw new ValidationError(`expected boolean but got ${data}`, options);
		});
		Schema.extend("bitset", (data, { bits, meta }, options) => {
			let value = 0, keys = [];
			if (typeof data === "number") {
				value = data;
				for (const key in bits) if (data & bits[key]) keys.push(key);
			} else if (Array.isArray(data)) {
				keys = data;
				for (const key of keys) {
					if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
					if (key in bits) value |= bits[key];
				}
			} else throw new ValidationError(`expected number or array but got ${data}`, options);
			if (value === meta.default) return [value];
			return [value, keys];
		});
		Schema.extend("function", (data, _, options) => {
			if (typeof data === "function") return [data];
			throw new ValidationError(`expected function but got ${data}`, options);
		});
		Schema.extend("is", (data, { constructor }, options) => {
			if (typeof constructor === "function") {
				if (data instanceof constructor) return [data];
				throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
			} else {
				if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
				let prototype = Object.getPrototypeOf(data);
				while (prototype) {
					if (prototype.constructor?.name === constructor) return [data];
					prototype = Object.getPrototypeOf(prototype);
				}
				throw new ValidationError(`expected ${constructor} but got ${data}`, options);
			}
		});
		function property(data, key, schema, options) {
			try {
				const [value, adapted] = Schema.resolve(data[key], schema, {
					...options,
					path: [...options.path || [], key]
				});
				if (adapted !== void 0) data[key] = adapted;
				return value;
			} catch (e) {
				if (!options?.autofix) throw e;
				delete data[key];
				return schema.meta.default;
			}
		}
		Schema.extend("array", (data, { inner, meta }, options) => {
			if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
			checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
			return [data.map((_, index) => property(data, index, inner, options))];
		});
		Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
			if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
			const result = {};
			for (const key in data) {
				let rKey;
				try {
					rKey = Schema.resolve(key, sKey, options)[0];
				} catch (error) {
					if (strict) continue;
					throw error;
				}
				result[rKey] = property(data, key, inner, options);
				data[rKey] = data[key];
				if (key !== rKey) delete data[key];
			}
			return [result];
		});
		Schema.extend("tuple", (data, { list }, options, strict) => {
			if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
			const result = list.map((inner, index) => property(data, index, inner, options));
			if (strict) return [result];
			result.push(...data.slice(list.length));
			return [result];
		});
		function merge(result, data) {
			for (const key in data) {
				if (key in result) continue;
				result[key] = data[key];
			}
		}
		Schema.extend("object", (data, { dict }, options, strict) => {
			if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
			const result = {};
			for (const key in dict) {
				const value = property(data, key, dict[key], options);
				if (!isNullable(value) || key in data) result[key] = value;
			}
			if (!strict) merge(result, data);
			return [result];
		});
		Schema.extend("union", (data, { list, toString }, options, strict) => {
			const messages = [];
			for (const inner of list) try {
				return Schema.resolve(data, inner, options, strict);
			} catch (error) {
				messages.push(error);
			}
			throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
		});
		Schema.extend("intersect", (data, { list, toString }, options, strict) => {
			if (!list.length) return [data];
			let result;
			for (const inner of list) {
				const value = Schema.resolve(data, inner, options, true)[0];
				if (isNullable(value)) continue;
				if (isNullable(result)) result = value;
				else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
				else if (typeof value === "object") merge(result ??= {}, value);
				else if (result !== value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
			}
			if (!strict && isPlainObject(data)) merge(result, data);
			return [result];
		});
		Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
			const [result, adapted = data] = Schema.resolve(data, inner, options, true);
			if (preserve) return [callback(result)];
			else return [callback(result), callback(adapted)];
		});
		const formatters = {};
		function defineMethod(name, keys, format) {
			formatters[name] = format;
			Object.assign(Schema, { [name](...args) {
				const schema = new Schema({ type: name });
				keys.forEach((key, index) => {
					switch (key) {
						case "sKey":
							schema.sKey = args[index] ?? Schema.string();
							break;
						case "inner":
							schema.inner = Schema.from(args[index]);
							break;
						case "list":
							schema.list = args[index].map(Schema.from);
							break;
						case "dict":
							schema.dict = mapValues(args[index], Schema.from);
							break;
						case "bits":
							schema.bits = {};
							for (const key in args[index]) {
								if (typeof args[index][key] !== "number") continue;
								schema.bits[key] = args[index][key];
							}
							break;
						case "callback": {
							const callback = schema.callback = args[index];
							callback["toJSON"] ||= () => callback.toString();
							break;
						}
						case "constructor": {
							const constructor = schema.constructor = args[index];
							if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
							break;
						}
						default: schema[key] = args[index];
					}
				});
				if (name === "object" || name === "dict") schema.meta.default = {};
				else if (name === "array" || name === "tuple") schema.meta.default = [];
				else if (name === "bitset") schema.meta.default = 0;
				return schema;
			} });
		}
		defineMethod("is", ["constructor"], ({ constructor }) => {
			if (typeof constructor === "function") return constructor.name;
			else return constructor;
		});
		defineMethod("any", [], () => "any");
		defineMethod("never", [], () => "never");
		defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
		defineMethod("string", [], () => "string");
		defineMethod("number", [], () => "number");
		defineMethod("boolean", [], () => "boolean");
		defineMethod("bitset", ["bits"], () => "bitset");
		defineMethod("function", [], () => "function");
		defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
		defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
		defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
		defineMethod("object", ["dict"], ({ dict }) => {
			if (Object.keys(dict).length === 0) return "{}";
			return `{ ${Object.entries(dict).map(([key, inner]) => {
				return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
			}).join(", ")} }`;
		});
		defineMethod("union", ["list"], ({ list }, inline) => {
			const result = list.map(({ toString: format }) => format()).join(" | ");
			return inline ? `(${result})` : result;
		});
		defineMethod("intersect", ["list"], ({ list }) => {
			return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
		});
		defineMethod("transform", [
			"inner",
			"callback",
			"preserve"
		], ({ inner }, isInner) => inner.toString(isInner));
		//#endregion
		//#region src/config.ts
		/** Configurable identity and scene for one persistent Agent RP character. */
		/** Preconfigured Comfy Cloud Saved Workflow orchestration used by the WebUI defaults. */
		const DEFAULT_COMFY_CLOUD_GUIDANCE_TEXT = `使用当前已配置且实际可见的 Comfy Cloud MCP 工具生成角色插图。目标工作流为 image_z_image_turbo。

优先将 image_z_image_turbo 作为 filename 调用 get_saved_workflow，并使用 summary_only 查看工作流实际暴露的 customizable_inputs。若找不到，再调用 list_saved_workflows 查找同名工作流，并严格使用工具返回的 filename；不要自行猜测或补充扩展名。

根据当前角色、服装、环境、动作、情绪和镜头构图生成适合本轮剧情的绘图提示词。仅覆盖 get_saved_workflow 明确暴露的文本提示词等输入；参数名称、节点 ID 和 slot 地址必须来自工具返回值，不要猜测。没有可安全覆盖的输入时，保留工作流默认值。

随后调用 run_saved_workflow 运行该工作流。若工具要求消费额度确认，首次调用不要擅自传入 confirm: true；只有用户已经明确同意本次消费后才能确认。

run_saved_workflow 返回任务后，按照实际返回值调用 wait_for_job 等待完成，再调用 get_output 获取输出。不要循环调用 get_job_status。

get_output 若返回已经准备好的下载命令，使用当前可用的命令或终端工具原样执行；不要改写、重新编码或手工拼接临时 URL。将图片下载到当前 Session 工作区，并使用命令实际产生的本地文件路径调用：

publish_roleplay_image({
  path: "<实际下载得到的本地图片路径>",
  caption: "<可选的简短角色内配文>"
})

不得把 URL、猜测的路径或尚未生成的文件传给 publish_roleplay_image。如果生图工具直接返回了本轮可用的标准图片附件，则可以省略 path。

任一步失败、工具不可见、工作流不存在或输出路径无法确认时，不循环重试，不编造成功结果；继续正常角色回复，只在确有必要时简短说明图片未生成。`;
		/** Default character traits; deployments may replace this text without changing the runtime. */
		const DEFAULT_PERSONA = "二十七岁，经营一家傍晚开门的旧书修复铺。观察敏锐，话不多，熟悉之后会显出一点促狭；不卖弄知识，也不急着把每句话说成结论。";
		/** Default opening situation for a fresh conversation. */
		const DEFAULT_SCENARIO = "一个下雨的傍晚，用户在修复铺打烊前走了进来。你们见过几次，还没有熟到无话不谈。";
		/** Default relationship state before durable conversation memories accumulate. */
		const DEFAULT_RELATIONSHIP = "你对用户有克制的熟悉感，愿意认真听对方说话；关系怎样变化，由后续对话决定。";
		/** Conservative defaults: keep existing guidance, expose publishing, and let the Agent decide when to draw. */
		const DEFAULT_TOOL_GUIDANCE = {
			enabled: true,
			includeFramework: true,
			includeAgentRp: true,
			imageMode: "auto",
			custom: [{
				id: "comfy-cloud-saved-workflow",
				enabled: true,
				text: DEFAULT_COMFY_CLOUD_GUIDANCE_TEXT
			}]
		};
		const ToolGuidanceEntryConfig = Schema.object({
			id: Schema.string().min(1).max(80),
			enabled: Schema.boolean().default(true),
			text: Schema.string().min(1).max(12e3)
		});
		const ToolGuidanceConfig = Schema.object({
			enabled: Schema.boolean().default(true),
			includeFramework: Schema.boolean().default(true),
			includeAgentRp: Schema.boolean().default(true),
			imageMode: Schema.union([
				"never",
				"auto",
				"always"
			]).default("auto"),
			custom: Schema.array(ToolGuidanceEntryConfig).default([])
		});
		Schema.object({
			mode: Schema.union(["host", "character"]).default("character"),
			characterName: Schema.string().min(1).max(80).default("岚"),
			persona: Schema.string().min(1).max(4e3).default(DEFAULT_PERSONA),
			scenario: Schema.string().min(1).max(4e3).default(DEFAULT_SCENARIO),
			relationship: Schema.string().min(1).max(2e3).default(DEFAULT_RELATIONSHIP),
			toolGuidance: ToolGuidanceConfig.default({
				enabled: true,
				includeFramework: true,
				includeAgentRp: true,
				imageMode: "auto",
				custom: [{
					id: "comfy-cloud-saved-workflow",
					enabled: true,
					text: DEFAULT_COMFY_CLOUD_GUIDANCE_TEXT
				}]
			})
		});
		function requiredText(value, fallback, field) {
			const normalized = (value ?? fallback).trim();
			if (normalized.length === 0) throw new TypeError(`${field} must contain non-whitespace text`);
			return normalized;
		}
		/** Normalize loader or WebUI tool-guidance input at one shared trust boundary. */
		function normalizeToolGuidanceConfig(value) {
			if (value !== void 0 && (typeof value !== "object" || value === null || Array.isArray(value))) throw new TypeError("toolGuidance must be an object");
			const source = value === void 0 ? {} : value;
			const bool = (field) => {
				const candidate = source[field];
				if (candidate === void 0) return DEFAULT_TOOL_GUIDANCE[field];
				if (typeof candidate !== "boolean") throw new TypeError(`toolGuidance.${field} is invalid`);
				return candidate;
			};
			const imageMode = source.imageMode ?? DEFAULT_TOOL_GUIDANCE.imageMode;
			if (imageMode !== "never" && imageMode !== "auto" && imageMode !== "always") throw new TypeError("toolGuidance.imageMode is invalid");
			const customSource = source.custom ?? DEFAULT_TOOL_GUIDANCE.custom;
			if (!Array.isArray(customSource) || customSource.length > 32) throw new TypeError("toolGuidance.custom is invalid");
			const custom = customSource.map((value, index) => {
				if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`toolGuidance.custom[${index}] is invalid`);
				const entry = value;
				if (typeof entry.id !== "string" || entry.id.length > 80 || typeof entry.text !== "string" || entry.text.length > 12e3 || entry.enabled !== void 0 && typeof entry.enabled !== "boolean") throw new TypeError(`toolGuidance.custom[${index}] is invalid`);
				return {
					id: requiredText(entry.id, "", `toolGuidance.custom[${index}].id`),
					enabled: entry.enabled ?? true,
					text: requiredText(entry.text, "", `toolGuidance.custom[${index}].text`)
				};
			});
			if (new Set(custom.map((entry) => entry.id)).size !== custom.length) throw new TypeError("toolGuidance custom entry ids must be unique");
			return {
				enabled: bool("enabled"),
				includeFramework: bool("includeFramework"),
				includeAgentRp: bool("includeAgentRp"),
				imageMode,
				custom
			};
		}
		//#endregion
		//#region src/workspace-settings.ts
		/** Same-origin Host route for Agent RP workspace preferences. */
		const AGENT_RP_WORKSPACE_SETTINGS_PATH = "/api/agent-rp/settings";
		/** Image providers available for explicit roleplay illustrations. */
		const AGENT_RP_IMAGE_PROVIDERS = [
			"openai",
			"novelai",
			"a1111",
			"comfyui"
		];
		const DEFAULT_IMAGE_PROFILE_ID = "default";
		const DEFAULT_IMAGE_GENERATION_SETTINGS = {
			provider: "openai",
			openai: {
				endpoint: "https://api.openai.com/v1/images/generations",
				model: "gpt-image-1",
				size: "1024x1024"
			},
			novelai: {
				endpoint: "https://image.novelai.net/ai/generate-image",
				model: "nai-diffusion-4-5-full",
				width: 832,
				height: 1216,
				steps: 28,
				scale: 5,
				sampler: "k_euler",
				noiseSchedule: "karras",
				cfgRescale: .18,
				negativePrompt: "",
				quality: true,
				smea: true,
				smeaDyn: true
			},
			a1111: {
				endpoint: "http://127.0.0.1:7860",
				model: "",
				width: 768,
				height: 1024,
				steps: 28,
				cfgScale: 7,
				sampler: "DPM++ 2M Karras",
				negativePrompt: ""
			},
			comfyui: {
				endpoint: "http://127.0.0.1:8188",
				workflow: "",
				width: 768,
				height: 1024,
				negativePrompt: ""
			}
		};
		/** Default settings preserve the existing all-workspace behavior. */
		const DEFAULT_AGENT_RP_SETTINGS = {
			workspaceMode: "all",
			workspaceIds: [],
			imageGeneration: DEFAULT_IMAGE_GENERATION_SETTINGS,
			activeImageProfileId: DEFAULT_IMAGE_PROFILE_ID,
			imageProfiles: [{
				id: DEFAULT_IMAGE_PROFILE_ID,
				name: "默认配置",
				settings: DEFAULT_IMAGE_GENERATION_SETTINGS
			}],
			toolGuidance: {
				...DEFAULT_TOOL_GUIDANCE,
				custom: DEFAULT_TOOL_GUIDANCE.custom.map((entry) => ({ ...entry }))
			}
		};
		function text(value, fallback, max, label) {
			if (value === void 0) return fallback;
			if (typeof value !== "string" || value.length > max) throw new Error(`${label}无效`);
			return value.trim();
		}
		function endpoint(value, fallback, label) {
			const candidate = text(value, fallback, 2e3, label);
			let parsed;
			try {
				parsed = new URL(candidate);
			} catch {
				throw new Error(`${label}无效`);
			}
			if (parsed.protocol !== "http:" && parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "" || parsed.hash !== "") throw new Error(`${label}无效`);
			return candidate;
		}
		function integer(value, fallback, min, max, label) {
			const candidate = value === void 0 ? fallback : value;
			if (!Number.isSafeInteger(candidate) || Number(candidate) < min || Number(candidate) > max) throw new Error(`${label}无效`);
			return Number(candidate);
		}
		function finite(value, fallback, min, max, label) {
			const candidate = value === void 0 ? fallback : value;
			if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate < min || candidate > max) throw new Error(`${label}无效`);
			return candidate;
		}
		function bool(value, fallback, label) {
			if (value === void 0) return fallback;
			if (typeof value !== "boolean") throw new Error(`${label}无效`);
			return value;
		}
		function novelAiDimension(value, fallback, label) {
			const candidate = integer(value, fallback, 64, 2048, label);
			if (candidate % 64 !== 0) throw new Error(`${label}必须是 64 的倍数`);
			return candidate;
		}
		/** Normalize image settings while accepting pre-image-generation settings files. */
		function normalizeImageGenerationSettings(value) {
			if (value === void 0) return structuredClone(DEFAULT_AGENT_RP_SETTINGS.imageGeneration);
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Agent RP 图片设置不是对象");
			const record = value;
			if (!AGENT_RP_IMAGE_PROVIDERS.includes(record.provider)) throw new Error("Agent RP 图片提供方无效");
			const openai = typeof record.openai === "object" && record.openai !== null && !Array.isArray(record.openai) ? record.openai : {};
			const novelai = typeof record.novelai === "object" && record.novelai !== null && !Array.isArray(record.novelai) ? record.novelai : {};
			const a1111 = typeof record.a1111 === "object" && record.a1111 !== null && !Array.isArray(record.a1111) ? record.a1111 : {};
			const comfyui = typeof record.comfyui === "object" && record.comfyui !== null && !Array.isArray(record.comfyui) ? record.comfyui : {};
			const size = openai.size ?? DEFAULT_AGENT_RP_SETTINGS.imageGeneration.openai.size;
			if (size !== "1024x1024" && size !== "1024x1536" && size !== "1536x1024") throw new Error("OpenAI 图片尺寸无效");
			const novelAiModel = novelai.model ?? DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.model;
			if (novelAiModel !== "nai-diffusion-4-5-full" && novelAiModel !== "nai-diffusion-4-5-curated") throw new Error("NovelAI 图片模型无效");
			return {
				provider: record.provider,
				openai: {
					endpoint: endpoint(openai.endpoint, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.openai.endpoint, "OpenAI 图片服务地址"),
					model: text(openai.model, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.openai.model, 200, "OpenAI 图片模型"),
					size
				},
				novelai: {
					endpoint: endpoint(novelai.endpoint, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.endpoint, "NovelAI 图片服务地址"),
					model: novelAiModel,
					width: novelAiDimension(novelai.width, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.width, "NovelAI 宽度"),
					height: novelAiDimension(novelai.height, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.height, "NovelAI 高度"),
					steps: integer(novelai.steps, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.steps, 1, 50, "NovelAI 步数"),
					scale: finite(novelai.scale, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.scale, 0, 20, "NovelAI 引导强度"),
					sampler: text(novelai.sampler, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.sampler, 100, "NovelAI 采样器"),
					noiseSchedule: text(novelai.noiseSchedule, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.noiseSchedule, 100, "NovelAI 噪声调度"),
					cfgRescale: finite(novelai.cfgRescale, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.cfgRescale, 0, 1, "NovelAI CFG Rescale"),
					negativePrompt: text(novelai.negativePrompt, "", 8e3, "NovelAI 负面提示词"),
					quality: bool(novelai.quality, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.quality, "NovelAI 质量增强"),
					smea: bool(novelai.smea, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.smea, "NovelAI SMEA"),
					smeaDyn: bool(novelai.smeaDyn, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.novelai.smeaDyn, "NovelAI SMEA DYN")
				},
				a1111: {
					endpoint: endpoint(a1111.endpoint, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.endpoint, "A1111 图片服务地址"),
					model: text(a1111.model, "", 500, "A1111 模型"),
					width: integer(a1111.width, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.width, 256, 2048, "A1111 宽度"),
					height: integer(a1111.height, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.height, 256, 2048, "A1111 高度"),
					steps: integer(a1111.steps, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.steps, 1, 150, "A1111 步数"),
					cfgScale: finite(a1111.cfgScale, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.cfgScale, 0, 30, "A1111 CFG"),
					sampler: text(a1111.sampler, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.a1111.sampler, 300, "A1111 采样器"),
					negativePrompt: text(a1111.negativePrompt, "", 8e3, "A1111 负面提示词")
				},
				comfyui: {
					endpoint: endpoint(comfyui.endpoint, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.comfyui.endpoint, "ComfyUI 服务地址"),
					workflow: text(comfyui.workflow, "", 256 * 1024, "ComfyUI API 工作流"),
					width: integer(comfyui.width, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.comfyui.width, 64, 4096, "ComfyUI 宽度"),
					height: integer(comfyui.height, DEFAULT_AGENT_RP_SETTINGS.imageGeneration.comfyui.height, 64, 4096, "ComfyUI 高度"),
					negativePrompt: text(comfyui.negativePrompt, "", 8e3, "ComfyUI 负面提示词")
				}
			};
		}
		/**
		* Validate one persisted or wire settings value.
		* @param value - untrusted JSON value.
		* @returns normalized settings with duplicate ids removed.
		*/
		function normalizeAgentRpSettings(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Agent RP 设置不是对象");
			const record = value;
			const workspaceMode = record.workspaceMode;
			const workspaceIds = record.workspaceIds;
			if (workspaceMode !== "all" && workspaceMode !== "selected" || !Array.isArray(workspaceIds) || workspaceIds.length > 1e3 || workspaceIds.some((id) => typeof id !== "string" || id.trim() !== id || id === "" || id.length > 256)) throw new Error("Agent RP 工作区设置字段无效");
			const imageGeneration = normalizeImageGenerationSettings(record.imageGeneration);
			const toolGuidance = normalizeToolGuidanceConfig(record.toolGuidance);
			let imageProfiles;
			let activeImageProfileId;
			if (record.imageProfiles === void 0) {
				activeImageProfileId = DEFAULT_IMAGE_PROFILE_ID;
				imageProfiles = [{
					id: activeImageProfileId,
					name: "默认配置",
					settings: imageGeneration
				}];
			} else {
				if (!Array.isArray(record.imageProfiles) || record.imageProfiles.length === 0 || record.imageProfiles.length > 50) throw new Error("图片服务配置档案无效");
				imageProfiles = record.imageProfiles.map((value) => {
					if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("图片服务配置档案无效");
					const profile = value;
					if (typeof profile.id !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/iu.test(profile.id)) throw new Error("图片服务配置档案 id 无效");
					if (typeof profile.name !== "string" || profile.name.trim() === "" || profile.name.trim().length > 80) throw new Error("图片服务配置档案名称无效");
					return {
						id: profile.id,
						name: profile.name.trim(),
						settings: normalizeImageGenerationSettings(profile.settings)
					};
				});
				if (new Set(imageProfiles.map((profile) => profile.id)).size !== imageProfiles.length) throw new Error("图片服务配置档案 id 重复");
				if (new Set(imageProfiles.map((profile) => profile.name.toLowerCase())).size !== imageProfiles.length) throw new Error("图片服务配置档案名称重复");
				activeImageProfileId = typeof record.activeImageProfileId === "string" ? record.activeImageProfileId : imageProfiles[0].id;
				if (!imageProfiles.some((profile) => profile.id === activeImageProfileId)) throw new Error("当前图片服务配置档案不存在");
			}
			const activeImageGeneration = imageProfiles.find((profile) => profile.id === activeImageProfileId).settings;
			return {
				workspaceMode,
				workspaceIds: [...new Set(workspaceIds)],
				imageGeneration: activeImageGeneration,
				activeImageProfileId,
				imageProfiles,
				toolGuidance
			};
		}
		/**
		* Decide whether a workspace may show a new Agent RP entry point.
		* @param settings - resolved Host settings, or undefined before they are available.
		* @param workspaceId - workspace owning the current Session, when registered.
		* @returns whether the entry point should be visible.
		*/
		function allowsAgentRpEntry(settings, workspaceId) {
			const resolved = settings ?? DEFAULT_AGENT_RP_SETTINGS;
			return resolved.workspaceMode === "all" || workspaceId !== void 0 && resolved.workspaceIds.includes(workspaceId);
		}
		//#endregion
		//#region src/image-generation-protocol.ts
		/** Browser-safe protocol for local roleplay image generation. */
		/** Same-origin route serving image jobs, assets, and credential state. */
		const AGENT_RP_IMAGE_PATH = "/api/agent-rp/images";
		/** Supported image generation intents. */
		const IMAGE_GENERATION_MODES = [
			"scene",
			"portrait",
			"avatar",
			"custom"
		];
		const JOB_ID_PATTERN = /^image-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
		const COMMAND_RECORD_PREFIX = "dsh-agent-rp:image:v0:";
		/** Validate one opaque browser-minted image job id. */
		function isImageJobId(value) {
			return JOB_ID_PATTERN.test(value);
		}
		/** Parse and validate one command request. */
		function parseImageGenerationRequest(value) {
			const parsed = typeof value === "string" ? JSON.parse(value.trim()) : value;
			if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("图片生成请求不是对象");
			const record = parsed;
			const prompt = typeof record.prompt === "string" ? record.prompt.trim() : "";
			if (record.format !== 0 || typeof record.jobId !== "string" || !isImageJobId(record.jobId) || typeof record.mode !== "string" || !IMAGE_GENERATION_MODES.includes(record.mode) || prompt.length < 1 || prompt.length > 8e3) throw new Error("图片生成请求字段无效");
			return {
				format: 0,
				jobId: record.jobId,
				mode: record.mode,
				prompt
			};
		}
		/** Decode a settled `/rp-draw` result without exposing image bytes to the transcript. */
		function decodeImageGenerationRecord(value) {
			if (value === void 0 || !value.startsWith(COMMAND_RECORD_PREFIX)) return void 0;
			try {
				const record = JSON.parse(value.slice(22));
				return record.format === 0 && typeof record.jobId === "string" && isImageJobId(record.jobId) ? { jobId: record.jobId } : void 0;
			} catch {
				return;
			}
		}
		/** Build the same-origin URL for job metadata. */
		function generatedImageJobUrl(jobId) {
			return `${AGENT_RP_IMAGE_PATH}/jobs/${encodeURIComponent(jobId)}`;
		}
		/** Build the same-origin URL for one immutable generated asset. */
		function generatedImageAssetUrl(jobId, download = false) {
			return `${AGENT_RP_IMAGE_PATH}/jobs/${encodeURIComponent(jobId)}/asset${download ? "?download=1" : ""}`;
		}
		//#endregion
		//#region src/rp-distribution-bridge-protocol.ts
		/** Browser-to-Host protocol for copying Agent RP assets into a local modular RP distribution. */
		/** Same-origin Agent RP endpoint that proxies only to a loopback RP distribution. */
		const RP_DISTRIBUTION_BRIDGE_PATH = "/api/agent-rp/rp-distribution";
		//#endregion
		//#region src/client/index.tsx
		function createWorkspaceSettingsSource() {
			const listeners = /* @__PURE__ */ new Set();
			let snapshot = {
				status: "loading",
				value: DEFAULT_AGENT_RP_SETTINGS
			};
			const publish = (next) => {
				snapshot = next;
				for (const listener of listeners) listener();
			};
			const decode = (value) => {
				if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Agent RP 设置响应无效");
				return normalizeAgentRpSettings(value.settings);
			};
			const load = async () => {
				try {
					const response = await fetch(AGENT_RP_WORKSPACE_SETTINGS_PATH, { headers: { accept: "application/json" } });
					const value = await response.json();
					if (!response.ok) throw new Error(value.error ?? `设置读取失败（${response.status}）`);
					publish({
						status: "ready",
						value: decode(value)
					});
				} catch (reason) {
					publish({
						status: "error",
						value: DEFAULT_AGENT_RP_SETTINGS,
						error: reason instanceof Error ? reason.message : String(reason)
					});
				}
			};
			load();
			return {
				getSnapshot: () => snapshot,
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				async set(settings) {
					const response = await fetch(AGENT_RP_WORKSPACE_SETTINGS_PATH, {
						method: "PUT",
						headers: {
							accept: "application/json",
							"content-type": "application/json"
						},
						body: JSON.stringify(settings)
					});
					const value = await response.json();
					if (!response.ok) throw new Error(value.error ?? `设置保存失败（${response.status}）`);
					publish({
						status: "ready",
						value: decode(value)
					});
				}
			};
		}
		async function imageCredentialInfo(provider) {
			const response = await fetch(`${AGENT_RP_IMAGE_PATH}/credential?provider=${encodeURIComponent(provider)}`, { headers: { accept: "application/json" } });
			const value = await response.json();
			if (!response.ok || value.credential === void 0) throw new Error(value.error ?? `图片密钥状态读取失败（${response.status}）`);
			return value.credential;
		}
		async function updateImageCredential(provider, change) {
			const response = await fetch(`${AGENT_RP_IMAGE_PATH}/credential?provider=${encodeURIComponent(provider)}`, {
				method: "PUT",
				headers: {
					accept: "application/json",
					"content-type": "application/json"
				},
				body: JSON.stringify(change)
			});
			const value = await response.json();
			if (!response.ok || value.credential === void 0) throw new Error(value.error ?? `图片密钥保存失败（${response.status}）`);
			return value.credential;
		}
		async function testConfiguredImageProvider(settings) {
			const response = await fetch(`${AGENT_RP_IMAGE_PATH}/test`, {
				method: "POST",
				headers: {
					accept: "application/json",
					"content-type": "application/json"
				},
				body: JSON.stringify(settings)
			});
			const value = await response.json();
			if (!response.ok || value.test === void 0) throw new Error(value.error ?? `图片服务连接测试失败（${response.status}）`);
			return value.test;
		}
		const color = "var(--dsw-alias-state-business-primary, #6f78e8)";
		const statusPlaceholder = "<StatusPlaceHolderImpl/>";
		const roleplayViewListeners = /* @__PURE__ */ new Map();
		const roleplayBackgroundListeners = /* @__PURE__ */ new Map();
		const roleplayExpressionListeners = /* @__PURE__ */ new Map();
		function roleplayViewKey(sessionId) {
			return `dsh.agent-rp.view.${sessionId}`;
		}
		function readRoleplayViewMode(sessionId) {
			return localStorage.getItem(roleplayViewKey(sessionId)) === "debug" ? "debug" : "immersive";
		}
		function setRoleplayViewMode(sessionId, mode) {
			if (mode === "immersive") localStorage.removeItem(roleplayViewKey(sessionId));
			else localStorage.setItem(roleplayViewKey(sessionId), mode);
			for (const listener of roleplayViewListeners.get(sessionId) ?? []) listener();
		}
		function useRoleplayViewMode(sessionId) {
			return (0, react.useSyncExternalStore)((callback) => {
				const listeners = roleplayViewListeners.get(sessionId) ?? /* @__PURE__ */ new Set();
				listeners.add(callback);
				roleplayViewListeners.set(sessionId, listeners);
				return () => {
					listeners.delete(callback);
					if (listeners.size === 0) roleplayViewListeners.delete(sessionId);
				};
			}, () => readRoleplayViewMode(sessionId), () => "immersive");
		}
		function roleplayBackgroundKey(sessionId) {
			return `dsh.agent-rp.background.${sessionId}`;
		}
		function readRoleplayBackground(sessionId) {
			const value = localStorage.getItem(roleplayBackgroundKey(sessionId));
			if (value === "off") return "off";
			if (value !== null && /^\d+$/u.test(value)) return Number(value);
			return "auto";
		}
		function setRoleplayBackground(sessionId, choice) {
			if (choice === "auto") localStorage.removeItem(roleplayBackgroundKey(sessionId));
			else localStorage.setItem(roleplayBackgroundKey(sessionId), String(choice));
			for (const listener of roleplayBackgroundListeners.get(sessionId) ?? []) listener();
		}
		function useRoleplayBackground(sessionId) {
			return (0, react.useSyncExternalStore)((callback) => {
				if (sessionId === void 0) return () => {};
				const listeners = roleplayBackgroundListeners.get(sessionId) ?? /* @__PURE__ */ new Set();
				listeners.add(callback);
				roleplayBackgroundListeners.set(sessionId, listeners);
				return () => {
					listeners.delete(callback);
					if (listeners.size === 0) roleplayBackgroundListeners.delete(sessionId);
				};
			}, () => sessionId === void 0 ? "auto" : readRoleplayBackground(sessionId), () => "auto");
		}
		function roleplayExpressionKey(sessionId) {
			return `dsh.agent-rp.expression.${sessionId}`;
		}
		function readRoleplayExpression(sessionId) {
			const value = localStorage.getItem(roleplayExpressionKey(sessionId));
			return value !== null && /^\d+$/u.test(value) ? Number(value) : "default";
		}
		function setRoleplayExpression(sessionId, choice) {
			if (choice === "default") localStorage.removeItem(roleplayExpressionKey(sessionId));
			else localStorage.setItem(roleplayExpressionKey(sessionId), String(choice));
			for (const listener of roleplayExpressionListeners.get(sessionId) ?? []) listener();
		}
		function useRoleplayExpression(sessionId) {
			return (0, react.useSyncExternalStore)((callback) => {
				if (sessionId === void 0) return () => {};
				const listeners = roleplayExpressionListeners.get(sessionId) ?? /* @__PURE__ */ new Set();
				listeners.add(callback);
				roleplayExpressionListeners.set(sessionId, listeners);
				return () => {
					listeners.delete(callback);
					if (listeners.size === 0) roleplayExpressionListeners.delete(sessionId);
				};
			}, () => sessionId === void 0 ? "default" : readRoleplayExpression(sessionId), () => "default");
		}
		const roleplayPresetPreferenceKey = "dsh.agent-rp.preset";
		const tavernScriptOriginsKey = "dsh.agent-rp.tavern-script-origins";
		const tavernScriptGenerationApprovalsKey = "dsh.agent-rp.tavern-script-generation-approvals";
		const tavernScriptCustomGenerationApprovalsKey = "dsh.agent-rp.tavern-script-custom-generation-approvals";
		const tavernScriptModelApprovalsKey = "dsh.agent-rp.tavern-script-model-approvals";
		function normalizedTavernScriptOrigin(value) {
			if (typeof value !== "string") return void 0;
			try {
				const url = new URL(value);
				return url.protocol === "https:" && url.origin === value ? url.origin : void 0;
			} catch {
				return;
			}
		}
		function normalizedTavernModelOrigin(value) {
			if (typeof value !== "string") return void 0;
			try {
				const url = new URL(value);
				return url.protocol === "http:" || url.protocol === "https:" ? url.origin : void 0;
			} catch {
				return;
			}
		}
		function readApprovedTavernScriptOrigins() {
			try {
				const value = JSON.parse(localStorage.getItem(tavernScriptOriginsKey) ?? "[]");
				if (!Array.isArray(value)) return /* @__PURE__ */ new Set();
				return new Set(value.flatMap((item) => {
					const origin = normalizedTavernScriptOrigin(item);
					return origin === void 0 ? [] : [origin];
				}));
			} catch {
				return /* @__PURE__ */ new Set();
			}
		}
		function writeApprovedTavernScriptOrigins(origins) {
			localStorage.setItem(tavernScriptOriginsKey, JSON.stringify([...origins].sort()));
		}
		function readApprovedTavernScriptGenerations() {
			try {
				const value = JSON.parse(localStorage.getItem(tavernScriptGenerationApprovalsKey) ?? "[]");
				if (!Array.isArray(value)) return /* @__PURE__ */ new Set();
				return new Set(value.filter((item) => typeof item === "string" && item.length <= 1024));
			} catch {
				return /* @__PURE__ */ new Set();
			}
		}
		function writeApprovedTavernScriptGenerations(approvals) {
			localStorage.setItem(tavernScriptGenerationApprovalsKey, JSON.stringify([...approvals].sort()));
		}
		function readApprovedTavernScriptCustomGenerations() {
			try {
				const value = JSON.parse(localStorage.getItem(tavernScriptCustomGenerationApprovalsKey) ?? "[]");
				if (!Array.isArray(value)) return /* @__PURE__ */ new Set();
				return new Set(value.filter((item) => typeof item === "string" && item.length <= 3072));
			} catch {
				return /* @__PURE__ */ new Set();
			}
		}
		function writeApprovedTavernScriptCustomGenerations(approvals) {
			localStorage.setItem(tavernScriptCustomGenerationApprovalsKey, JSON.stringify([...approvals].sort()));
		}
		function readApprovedTavernScriptModels() {
			try {
				const value = JSON.parse(localStorage.getItem(tavernScriptModelApprovalsKey) ?? "[]");
				if (!Array.isArray(value)) return /* @__PURE__ */ new Set();
				return new Set(value.filter((item) => typeof item === "string" && item.length <= 3072));
			} catch {
				return /* @__PURE__ */ new Set();
			}
		}
		function writeApprovedTavernScriptModels(approvals) {
			localStorage.setItem(tavernScriptModelApprovalsKey, JSON.stringify([...approvals].sort()));
		}
		function readRoleplayPresetPreference() {
			const value = localStorage.getItem(roleplayPresetPreferenceKey);
			return value !== null && /^[a-z0-9-]{8,80}$/u.test(value) ? value : "";
		}
		function writeRoleplayPresetPreference(presetId) {
			localStorage.setItem(roleplayPresetPreferenceKey, presetId);
		}
		async function renamePresetLibraryEntry(id, name) {
			const response = await fetch(`${PRESET_LIBRARY_PATH}?id=${encodeURIComponent(id)}`, {
				method: "PATCH",
				headers: {
					accept: "application/json",
					"content-type": "application/json"
				},
				body: JSON.stringify({ name })
			});
			const value = await response.json();
			if (!response.ok || value.entry === void 0) throw new Error(value.error ?? `预设改名失败（${response.status}）`);
			return value.entry;
		}
		function usePresetPreference(listPresets, enabled = true) {
			const [entries, setEntries] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const [presetId, setPresetId] = (0, react.useState)(readRoleplayPresetPreference);
			(0, react.useEffect)(() => {
				if (!enabled) {
					setEntries([]);
					setError(void 0);
					return;
				}
				let current = true;
				setEntries(void 0);
				setError(void 0);
				listPresets().then((value) => {
					if (!current) return;
					setEntries(value);
					setPresetId((selectedId) => {
						if (value.some((entry) => entry.id === selectedId)) return selectedId;
						writeRoleplayPresetPreference("");
						return "";
					});
				}, (reason) => {
					if (!current) return;
					setEntries([]);
					setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					current = false;
				};
			}, [enabled, listPresets]);
			return {
				entries,
				...error === void 0 ? {} : { error },
				presetId,
				selectPreset(value) {
					writeRoleplayPresetPreference(value);
					setPresetId(value);
				},
				selectImportedPreset(entry) {
					setEntries((current) => [entry, ...(current ?? []).filter((candidate) => candidate.id !== entry.id)]);
					writeRoleplayPresetPreference(entry.id);
					setPresetId(entry.id);
				},
				async renamePreset(id, name) {
					const entry = await renamePresetLibraryEntry(id, name);
					setEntries((current) => (current ?? []).map((candidate) => candidate.id === id ? entry : candidate));
					return entry;
				}
			};
		}
		async function characterLibraryJson(path = "") {
			const response = await fetch(`${CHARACTER_LIBRARY_PATH}${path}`, { headers: { accept: "application/json" } });
			const value = await response.json();
			if (!response.ok) throw new Error(value.error ?? `角色库请求失败（${response.status}）`);
			return value;
		}
		async function fetchCharacterDetail(id) {
			return (await characterLibraryJson(`/${encodeURIComponent(id)}`)).entry;
		}
		const characterLibraryChangedEvent = "agent-rp:character-library-changed";
		async function updateCharacterRemoteResource(id, origin, approved) {
			const response = await fetch(`${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(id)}/remote-resources/${approved ? "approve" : "revoke"}?origin=${encodeURIComponent(origin)}`, {
				method: "POST",
				headers: { accept: "application/json" }
			});
			const value = await response.json();
			if (!response.ok || value.entry === void 0) throw new Error(value.error ?? `外部资源授权失败（${response.status}）`);
			window.dispatchEvent(new CustomEvent(characterLibraryChangedEvent, { detail: { id } }));
			return value.entry;
		}
		const characterWorldInfoPageSize = 40;
		async function fetchCharacterWorldInfoPage(id, offset) {
			const query = new URLSearchParams({
				offset: String(offset),
				limit: String(characterWorldInfoPageSize)
			});
			const response = await fetch(`${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(id)}/world-info?${query}`, { headers: { accept: "application/json" } });
			const value = await response.json();
			if (!response.ok || value.format !== 0 || value.page === void 0) throw new Error(value.error ?? `角色世界书读取失败（${response.status}）`);
			return value.page;
		}
		function useCharacterDetail(libraryId) {
			const [detail, setDetail] = (0, react.useState)();
			(0, react.useEffect)(() => {
				let current = true;
				if (libraryId === void 0) return () => {
					current = false;
				};
				const load = () => {
					fetchCharacterDetail(libraryId).then((value) => {
						if (current) setDetail(value);
					}, () => {
						if (current) setDetail(void 0);
					});
				};
				setDetail(void 0);
				load();
				const changed = (event) => {
					if (event.detail?.id === libraryId) load();
				};
				window.addEventListener(characterLibraryChangedEvent, changed);
				return () => {
					current = false;
					window.removeEventListener(characterLibraryChangedEvent, changed);
				};
			}, [libraryId]);
			return detail;
		}
		function backgroundAssets(detail) {
			return detail?.imageAssets.filter((asset) => asset.type === "background") ?? [];
		}
		function selectedBackground(detail, choice) {
			if (choice === "off") return void 0;
			const backgrounds = backgroundAssets(detail);
			return choice === "auto" ? backgrounds.find((asset) => asset.name.trim().toLocaleLowerCase() === "main") ?? backgrounds[0] : backgrounds.find((asset) => asset.index === choice);
		}
		const cardFrameRevealFallbackMs = 250;
		function BlockedCardResources({ character, origins }) {
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				role: "note",
				style: {
					background: "var(--dsw-alias-bg-layer-1, #202024)",
					border: "1px solid var(--dsw-alias-border-l2, #39393c)",
					borderRadius: "10px",
					fontSize: "12px",
					lineHeight: 1.55,
					padding: "12px 14px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
						style: {
							display: "block",
							fontSize: "13px"
						},
						children: "外部界面尚未加载"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: {
							display: "block",
							marginTop: "3px",
							opacity: .56
						},
						children: [
							"这段开场需要从 ",
							origins.map((origin) => new URL(origin).hostname).join("、"),
							" 读取资源；确认后仍只在隔离页面中运行"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy,
						onClick: () => {
							setBusy(true);
							setError(void 0);
							(async () => {
								for (const origin of origins) await updateCharacterRemoteResource(character.id, origin, true);
							})().then(() => {
								setBusy(false);
							}, (reason) => {
								setBusy(false);
								setError(reason instanceof Error ? reason.message : String(reason));
							});
						},
						style: {
							...miniButtonStyle,
							marginTop: "9px"
						},
						children: busy ? "正在确认…" : "允许这些来源并加载"
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						role: "alert",
						style: {
							color: "#e88989",
							display: "block",
							marginTop: "6px"
						},
						children: error
					})
				]
			});
		}
		function CharacterDisplay({ compilation, statData, characterName, character, preview = false }) {
			const compiled = (0, react.useMemo)(() => compileCardFrames(compilation, {
				origin: window.location.origin,
				textColor: getComputedStyle(document.body).color,
				...statData === void 0 ? {} : { statData },
				...character === void 0 ? {} : { character }
			}), [
				character,
				compilation,
				statData
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-character-display": true,
				"data-agent-rp-display-diagnostics": cardFrameDiagnosticSummary(compiled.diagnostics),
				style: {
					display: "grid",
					gap: "10px",
					minWidth: 0
				},
				children: compiled.segments.map((segment, index) => {
					if (segment.kind === "markdown") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: segment.text }, index);
					if (preview && segment.interactive) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "note",
						style: {
							alignItems: "center",
							background: "var(--dsw-alias-bg-layer-1, #202024)",
							border: "1px solid var(--dsw-alias-border-l2, #39393c)",
							borderRadius: "10px",
							display: "flex",
							gap: "11px",
							minHeight: "92px",
							padding: "15px 16px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							style: {
								fontSize: "20px",
								opacity: .7
							},
							children: "◇"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: { minWidth: 0 },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									display: "block",
									fontSize: "13px"
								},
								children: "交互式开场"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									display: "block",
									fontSize: "11px",
									lineHeight: 1.55,
									marginTop: "4px",
									opacity: .56
								},
								children: "这段内容需要脚本或外部界面，开始新对话后再启动；角色库不会在后台运行它"
							})]
						})]
					}, index);
					if (!preview && character !== void 0) {
						const approved = new Set(character.approvedRemoteResourceOrigins);
						const blocked = segment.remoteOrigins.filter((origin) => character.remoteResourceOrigins.includes(origin) && !approved.has(origin));
						if (blocked.length > 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BlockedCardResources, {
							character,
							origins: blocked
						}, index);
					}
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
						title: `${characterName}的轻前端界面 ${index + 1}`,
						"data-agent-rp-frame": true,
						"data-agent-rp-frame-kind": segment.sourceKind,
						sandbox: preview ? "" : "allow-scripts",
						srcDoc: segment.srcDoc,
						onLoad: (event) => {
							const frame = event.currentTarget;
							frame.contentWindow?.postMessage({
								source: "dsh-agent-rp-host",
								action: "request-resize"
							}, "*");
							window.setTimeout(() => {
								if (frame.isConnected && frame.style.visibility === "hidden") frame.style.visibility = "visible";
							}, cardFrameRevealFallbackMs);
						},
						style: {
							background: "transparent",
							border: 0,
							colorScheme: "dark",
							display: "block",
							height: preview ? "min(52vh, 480px)" : "72px",
							maxWidth: "100%",
							visibility: preview ? "visible" : "hidden",
							width: "100%"
						}
					}, index);
				})
			});
		}
		function compactCharacterDisplayText(value) {
			const segments = splitCharacterDisplay(value);
			const summary = segments.filter((segment) => segment.kind === "markdown").map((segment) => {
				const source = k$1.parse(segment.text, {
					async: false,
					breaks: true,
					gfm: true
				});
				const document = new DOMParser().parseFromString(source, "text/html");
				document.querySelectorAll("style,script,noscript,template,svg").forEach((element) => {
					element.remove();
				});
				document.querySelectorAll("br").forEach((element) => {
					element.replaceWith("\n");
				});
				document.querySelectorAll("p,div,li,h1,h2,h3,h4,h5,h6,blockquote,section,article").forEach((element) => {
					element.append("\n");
				});
				return document.body.textContent ?? "";
			}).join("\n").split(/\r?\n/gu).map((line) => line.replace(/[\t ]+/gu, " ").trim()).filter(Boolean).join(" · ");
			if (!segments.some((segment) => segment.kind !== "markdown")) return summary;
			return summary === "" ? "包含轻前端界面，展开预览" : `${summary} · 包含轻前端界面`;
		}
		function DisclosureChevron({ expanded, size = 15 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				"aria-hidden": "true",
				viewBox: "0 0 16 16",
				width: size,
				height: size,
				style: {
					display: "block",
					flex: "none",
					transform: expanded ? "rotate(180deg)" : void 0,
					transition: "transform 140ms ease"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3.5 6 8 10.25 12.5 6",
					fill: "none",
					stroke: "currentColor",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					strokeWidth: "1.6"
				})
			});
		}
		function SelectChevron() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-hidden": "true",
				style: {
					alignItems: "center",
					display: "flex",
					opacity: .72,
					pointerEvents: "none",
					position: "absolute",
					right: "12px",
					top: 0,
					bottom: 0
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DisclosureChevron, {
					expanded: false,
					size: 14
				})
			});
		}
		function CharacterWorldInfoSection({ detail }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [entries, setEntries] = (0, react.useState)(detail.worldInfo?.entries ?? []);
			const [total, setTotal] = (0, react.useState)(detail.worldInfo?.entries.length ?? detail.worldInfoCount);
			const [loading, setLoading] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const loadingRef = (0, react.useRef)(false);
			if (detail.worldInfoCount === 0) return null;
			const loadMore = () => {
				if (loadingRef.current || entries.length >= total) return;
				loadingRef.current = true;
				setLoading(true);
				setError(void 0);
				fetchCharacterWorldInfoPage(detail.id, entries.length).then((page) => {
					setEntries((current) => [...current, ...page.entries]);
					setTotal(page.total);
					loadingRef.current = false;
					setLoading(false);
				}, (reason) => {
					loadingRef.current = false;
					setLoading(false);
					setError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					background: "var(--dsw-alias-bg-layer-1, #202024)",
					border: "1px solid var(--dsw-alias-border-l2, #39393c)",
					borderRadius: "10px",
					margin: "4px 0 12px",
					overflow: "hidden"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-expanded": open,
					onClick: () => {
						const next = !open;
						setOpen(next);
						if (next && entries.length === 0) loadMore();
					},
					title: "查看角色卡内置世界书",
					style: {
						alignItems: "center",
						background: "transparent",
						border: 0,
						color: "inherit",
						cursor: "pointer",
						display: "flex",
						font: "inherit",
						gap: "9px",
						padding: "10px 11px",
						textAlign: "left",
						width: "100%"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: { fontSize: "12px" },
							children: "世界书"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								background: `color-mix(in srgb, ${color} 14%, transparent)`,
								borderRadius: "999px",
								color,
								fontSize: "10px",
								padding: "2px 7px"
							},
							children: [detail.worldInfoCount, " 条"]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: "10px",
								marginLeft: "auto",
								opacity: .46
							},
							children: "原卡 · 只读"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DisclosureChevron, { expanded: open })
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						borderTop: "1px solid var(--dsw-alias-border-l2, #39393c)",
						display: "grid",
						gap: "6px",
						padding: "8px"
					},
					children: [
						entries.map((entry, index) => {
							const title = entry.name?.trim() || entry.comment?.trim() || `条目 ${index + 1}`;
							const activation = !entry.enabled ? "已停用" : entry.constant ? "常驻" : entry.keys.length === 0 ? "无关键词" : `${entry.useRegex ? "正则" : "关键词"} · ${entry.keys.length}`;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								style: {
									background: "color-mix(in srgb, var(--dsw-alias-bg-base, #171719) 56%, transparent)",
									border: "1px solid var(--dsw-alias-border-l2, #39393c)",
									borderRadius: "8px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", {
									style: {
										alignItems: "center",
										cursor: "pointer",
										display: "flex",
										gap: "8px",
										listStyle: "none",
										padding: "8px 9px"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										title,
										style: {
											flex: 1,
											fontSize: "11px",
											fontWeight: 620,
											minWidth: 0,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: title
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: "10px",
											opacity: entry.enabled ? .52 : .32
										},
										children: activation
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										borderTop: "1px solid var(--dsw-alias-border-l2, #39393c)",
										padding: "8px 9px 9px"
									},
									children: [!entry.constant && entry.keys.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											fontSize: "10px",
											lineHeight: 1.55,
											marginBottom: "6px",
											opacity: .5
										},
										children: entry.keys.join(" · ")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											fontSize: "11px",
											lineHeight: 1.6,
											opacity: .7,
											whiteSpace: "pre-wrap"
										},
										children: entry.content || "无内容"
									})]
								})]
							}, `${entry.sourceId}-${index}`);
						}),
						loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							role: "status",
							style: {
								fontSize: "11px",
								opacity: .52,
								padding: "10px",
								textAlign: "center"
							},
							children: "正在读取世界书…"
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							role: "alert",
							style: {
								alignItems: "center",
								color: "#e88989",
								display: "flex",
								fontSize: "11px",
								gap: "8px",
								justifyContent: "center",
								padding: "8px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: error }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: loadMore,
								style: miniButtonStyle,
								children: "重试"
							})]
						}),
						!loading && error === void 0 && entries.length < total && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: loadMore,
							style: {
								...secondaryButtonStyle,
								justifySelf: "center",
								margin: "4px 0 2px",
								minWidth: "150px"
							},
							children: [
								"继续显示（",
								entries.length,
								"/",
								total,
								"）"
							]
						})
					]
				})]
			});
		}
		function replySceneNote(value) {
			return splitCharacterDisplay(value.replaceAll(statusPlaceholder, "")).filter((segment) => segment.kind === "markdown").map((segment) => segment.text.trim()).filter(Boolean).join("\n\n").slice(0, 4e3);
		}
		function RewriteTurnDialog({ initialText, busy, error, onClose, onRewrite }) {
			const [text, setText] = (0, react.useState)(initialText);
			const submit = () => {
				if (!busy && text.trim() !== "") onRewrite(text);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-dialog": true,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "修改这轮输入",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.56)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "16px",
					position: "fixed",
					zIndex: 1100
				},
				onMouseDown: (event) => {
					if (!busy && event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #171719)",
						border: "1px solid var(--dsw-alias-border-l2, #39393c)",
						borderRadius: "14px",
						boxShadow: "0 18px 70px rgba(0,0,0,.38)",
						maxWidth: "620px",
						padding: "18px",
						width: "100%"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							style: {
								fontSize: "15px",
								margin: 0
							},
							children: "修改这轮输入"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								fontSize: "12px",
								lineHeight: 1.6,
								margin: "7px 0 12px",
								opacity: .62
							},
							children: "会保留当前对话，并从修改后的输入创建一个新分支。"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							autoFocus: true,
							"aria-label": "修改后的输入",
							disabled: busy,
							maxLength: 8e3,
							value: text,
							onChange: (event) => {
								setText(event.target.value);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) submit();
							},
							style: {
								background: "var(--dsw-alias-bg-layer-1, #202024)",
								border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
								borderRadius: "10px",
								boxSizing: "border-box",
								color: "inherit",
								font: "inherit",
								fontSize: "13px",
								lineHeight: 1.65,
								minHeight: "132px",
								padding: "10px 12px",
								resize: "vertical",
								width: "100%"
							}
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							style: {
								color: "#dc7777",
								fontSize: "12px",
								margin: "9px 0 0"
							},
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "8px",
								justifyContent: "flex-end",
								marginTop: "14px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: onClose,
								style: {
									...generationButtonStyle,
									fontSize: "12px",
									minHeight: "30px"
								},
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy || text.trim() === "",
								onClick: submit,
								style: {
									...generationButtonStyle,
									background: `color-mix(in srgb, ${color} 18%, transparent)`,
									borderColor: `color-mix(in srgb, ${color} 48%, transparent)`,
									fontSize: "12px",
									minHeight: "30px",
									opacity: 1
								},
								children: busy ? "正在创建…" : "创建新分支"
							})]
						})
					]
				})
			});
		}
		function PublishedRoleplayImageAsset({ attachment, alt, load }) {
			const [src, setSrc] = (0, react.useState)();
			const [failed, setFailed] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				let active = true;
				let objectUrl;
				setSrc(void 0);
				setFailed(false);
				load(String(attachment.attachmentId)).then((url) => {
					if (!active) {
						if (url?.startsWith("blob:") === true) URL.revokeObjectURL(url);
						return;
					}
					if (url === void 0) {
						setFailed(true);
						return;
					}
					objectUrl = url;
					setSrc(url);
				}, () => {
					if (active) setFailed(true);
				});
				return () => {
					active = false;
					if (objectUrl?.startsWith("blob:") === true) URL.revokeObjectURL(objectUrl);
				};
			}, [attachment.attachmentId, load]);
			if (failed) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "alert",
				style: {
					fontSize: "12px",
					opacity: .62,
					padding: "18px"
				},
				children: "图片附件读取失败"
			});
			if (src === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "status",
				style: {
					fontSize: "12px",
					opacity: .55,
					padding: "18px"
				},
				children: "正在载入插图…"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					minWidth: 0
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					src,
					alt,
					loading: "lazy",
					style: {
						background: "rgba(0,0,0,.2)",
						display: "block",
						maxHeight: "720px",
						objectFit: "contain",
						width: "100%"
					}
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
					href: src,
					download: attachment.name ?? "roleplay-image",
					style: {
						...generationButtonStyle,
						alignSelf: "flex-start",
						margin: "9px 12px 11px",
						textDecoration: "none"
					},
					children: "下载"
				})]
			});
		}
		function PublishedRoleplayImageCard({ publication, load }) {
			const title = publication.caption?.trim() || "角色插图";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
				"data-agent-rp-published-image": true,
				style: {
					background: "color-mix(in srgb, var(--dsw-alias-bg-layer-1, #202126) 82%, transparent)",
					border: "1px solid var(--dsw-alias-border-l2, #383a41)",
					borderRadius: "12px",
					margin: "8px 0",
					maxWidth: "680px",
					overflow: "hidden",
					width: "100%"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					style: {
						alignItems: "center",
						display: "flex",
						gap: "9px",
						padding: "10px 12px"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						style: {
							color,
							fontSize: "15px"
						},
						children: "✦"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
						style: {
							fontSize: "12px",
							fontWeight: 620
						},
						children: title
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						display: "grid",
						gap: "1px",
						gridTemplateColumns: publication.images.length > 1 ? "repeat(2, minmax(0, 1fr))" : "1fr"
					},
					children: publication.images.map((attachment, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PublishedRoleplayImageAsset, {
						attachment,
						alt: publication.caption ?? `角色插图 ${index + 1}`,
						load
					}, String(attachment.attachmentId)))
				})]
			});
		}
		function GenerationTail({ matched, runGeneration, rewriteTurn, continueFromTurn, runImageGeneration, loadPublishedImage, sessionId, turn, useProjection, useSession }) {
			const projection = useProjection("agentRp");
			const running = useSession((snapshot) => snapshot.running);
			const replyText = useSession((snapshot) => {
				const node = snapshot.chat.legacy.nodes.find((candidate) => candidate.kind === "assistant" && candidate.seq === matched.replySeq);
				return node?.kind === "assistant" ? node.blocks.filter((block) => block.kind === "text").map((block) => block.text).join("\n") : "";
			});
			const editableUserText = useSession((snapshot) => {
				if (turn.start === void 0 || turn.end === void 0) return void 0;
				const node = snapshot.chat.legacy.nodes.find((candidate) => candidate.kind === "user" && candidate.seq > turn.start.seq && candidate.seq < turn.end.seq);
				if (node?.kind !== "user" || node.content.length === 0 || node.content.some((block) => block.type !== "text")) return void 0;
				return node.content.map((block) => block.type === "text" ? block.text : "").join("\n");
			});
			const [busy, setBusy] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const [drawOpen, setDrawOpen] = (0, react.useState)(false);
			const [rewriteOpen, setRewriteOpen] = (0, react.useState)(false);
			const group = projection?.generations.find((candidate) => candidate.anchorSeq === matched.replySeq);
			if (projection === void 0) return null;
			const selectedReplySeq = group?.selectedVersionSeq ?? matched.replySeq;
			const publishedImages = projection.publishedImages.filter((image) => image.replySeq === selectedReplySeq);
			const currentReply = projection.currentReplySeq === matched.replySeq;
			const sceneNote = replySceneNote(replyText);
			const selectedIndex = group?.versions.findIndex((version) => version.seq === group.selectedVersionSeq) ?? 0;
			const invoke = (request) => {
				setBusy(request.operation);
				setError(void 0);
				runGeneration(sessionId, request).then(() => {
					setBusy(void 0);
				}, (reason) => {
					setBusy(void 0);
					setError(reason instanceof Error ? reason.message : "回复操作失败");
				});
			};
			const disabled = running || busy !== void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [publishedImages.map((publication) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PublishedRoleplayImageCard, {
				publication,
				load: loadPublishedImage
			}, publication.id)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-agent-rp-generation-tail": true,
				style: {
					alignItems: "center",
					background: "color-mix(in srgb, currentColor 4%, transparent)",
					border: "1px solid color-mix(in srgb, currentColor 10%, transparent)",
					borderRadius: "9px",
					display: "flex",
					flexWrap: "wrap",
					gap: "2px",
					marginRight: "auto",
					padding: "3px"
				},
				children: [
					currentReply && group !== void 0 && group.versions.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "上一版回复",
							disabled: disabled || selectedIndex <= 0,
							onClick: () => {
								invoke({
									operation: "select",
									replySeq: matched.replySeq,
									versionIndex: selectedIndex - 1
								});
							},
							style: generationActionButtonStyle,
							children: "‹"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								fontSize: "11px",
								minWidth: "34px",
								opacity: .56,
								textAlign: "center"
							},
							children: [
								selectedIndex + 1,
								" / ",
								group.versions.length
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "下一版回复",
							disabled: disabled || selectedIndex >= group.versions.length - 1,
							onClick: () => {
								invoke({
									operation: "select",
									replySeq: matched.replySeq,
									versionIndex: selectedIndex + 1
								});
							},
							style: generationActionButtonStyle,
							children: "›"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							style: generationActionDividerStyle
						})
					] }),
					currentReply && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled,
						onClick: () => {
							invoke({
								operation: "regenerate",
								replySeq: matched.replySeq
							});
						},
						style: generationActionButtonStyle,
						children: busy === "regenerate" ? "生成中…" : "重新生成"
					}),
					currentReply && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled,
						onClick: () => {
							invoke({
								operation: "continue",
								replySeq: matched.replySeq
							});
						},
						style: generationActionButtonStyle,
						children: busy === "continue" ? "生成中…" : "继续生成"
					}),
					currentReply && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: disabled || sceneNote === "",
						onClick: () => {
							setDrawOpen(true);
						},
						style: generationActionButtonStyle,
						children: "生成插图"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						title: editableUserText === void 0 ? "这一轮含附件或没有用户消息，暂时不能修改" : "保留当前对话，从修改后的输入创建新分支",
						disabled: disabled || editableUserText === void 0,
						onClick: () => {
							setError(void 0);
							setRewriteOpen(true);
						},
						style: generationActionButtonStyle,
						children: "修改输入"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						title: "保留截至这里的对话，并创建一个新分支",
						disabled: disabled || turn.end === void 0,
						onClick: () => {
							if (turn.end === void 0) return;
							setBusy("fork");
							setError(void 0);
							continueFromTurn(sessionId, turn.end.seq).then(() => {
								setBusy(void 0);
							}, (reason) => {
								setBusy(void 0);
								setError(reason instanceof Error ? reason.message : "无法从这里继续");
							});
						},
						style: generationActionButtonStyle,
						children: busy === "fork" ? "正在创建…" : "创建分支"
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						role: "alert",
						title: error,
						style: {
							color: "#dc7777",
							fontSize: "10px",
							maxWidth: "220px",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap"
						},
						children: error
					}),
					currentReply && drawOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageGenerationDialog, {
						projection,
						initialMode: "scene",
						initialNote: sceneNote,
						onClose: () => {
							setDrawOpen(false);
						},
						onGenerate: (request) => {
							runImageGeneration(sessionId, request);
						}
					}),
					rewriteOpen && editableUserText !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RewriteTurnDialog, {
						initialText: editableUserText,
						busy: busy === "rewrite",
						...error === void 0 ? {} : { error },
						onClose: () => {
							if (busy !== "rewrite") setRewriteOpen(false);
						},
						onRewrite: (text) => {
							setBusy("rewrite");
							setError(void 0);
							rewriteTurn(sessionId, turn.turn, text).then(() => {
								setBusy(void 0);
								setRewriteOpen(false);
							}, (reason) => {
								setBusy(void 0);
								setError(reason instanceof Error ? reason.message : "无法创建改写对话");
							});
						}
					})
				]
			})] });
		}
		const generationButtonStyle = {
			background: "transparent",
			border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
			borderRadius: "6px",
			color: "inherit",
			cursor: "pointer",
			font: "inherit",
			fontSize: "10px",
			lineHeight: 1,
			minHeight: "24px",
			minWidth: "24px",
			opacity: .58,
			padding: "4px 7px"
		};
		const generationActionButtonStyle = {
			alignItems: "center",
			background: "transparent",
			border: 0,
			borderRadius: "6px",
			color: "inherit",
			cursor: "pointer",
			display: "inline-flex",
			font: "inherit",
			fontSize: "11px",
			fontWeight: 520,
			justifyContent: "center",
			lineHeight: 1.2,
			minHeight: "28px",
			minWidth: "28px",
			opacity: .68,
			padding: "5px 8px",
			whiteSpace: "nowrap"
		};
		const generationActionDividerStyle = {
			alignSelf: "stretch",
			background: "color-mix(in srgb, currentColor 10%, transparent)",
			margin: "3px 2px",
			width: "1px"
		};
		const headerMenuItemStyle = {
			background: "transparent",
			border: 0,
			borderRadius: "7px",
			color: "inherit",
			cursor: "pointer",
			font: "inherit",
			fontSize: "12px",
			padding: "8px 9px",
			textAlign: "left",
			whiteSpace: "nowrap"
		};
		function initials(name) {
			return [...name.trim()].slice(0, 1).join("").toUpperCase() || "RP";
		}
		function characterCapabilitySummary(projection) {
			const parts = [
				projection.worldInfoCount > 0 ? `${projection.worldInfoCount} 条世界书` : void 0,
				(projection.frontend?.regexScripts.length ?? 0) > 0 ? "角色卡正则" : void 0,
				(projection.frontend?.tavernHelperScriptNames.length ?? 0) > 0 ? "酒馆脚本" : void 0,
				projection.mvu === void 0 ? void 0 : "动态状态",
				projection.preset === void 0 ? void 0 : `预设 · ${projection.preset.enabledCount} 项启用`
			].filter((part) => part !== void 0);
			return parts.length === 0 ? "继续这段对话" : parts.join(" · ");
		}
		function hideWhileMounted(elements) {
			const states = elements.filter((element) => element != null).map((element) => ({
				element,
				display: element.style.getPropertyValue("display"),
				priority: element.style.getPropertyPriority("display")
			}));
			for (const { element } of states) element.style.setProperty("display", "none", "important");
			return () => {
				for (const { element, display, priority } of states) if (display === "") element.style.removeProperty("display");
				else element.style.setProperty("display", display, priority);
			};
		}
		function roleplaySummary(summary, projection) {
			if (summary?.agentPreset !== "agent-rp") return void 0;
			if (projection !== void 0) return projection;
			return {
				characterName: summary.displayTitle,
				description: "",
				personality: "",
				scenario: "",
				importedMessageCount: 0,
				worldInfoCount: 0,
				worldInfo: {
					revision: 0,
					activeCount: 0,
					tokenBudget: 4096,
					approximateTokens: 0,
					budgetExcludedCount: 0,
					books: []
				},
				presetLibrary: [],
				generations: [],
				publishedImages: [],
				source: "preset"
			};
		}
		function roleplayDisplayName(summary, projection) {
			return summary?.title?.trim() || projection.characterName;
		}
		function Avatar({ projection, loadAvatar, imageUrl, size = 40 }) {
			const [src, setSrc] = (0, react.useState)();
			(0, react.useEffect)(() => {
				let current = true;
				let objectUrl;
				const attachmentId = projection.avatarAttachmentId;
				const libraryId = projection.avatarLibraryId;
				if (imageUrl !== void 0) {
					setSrc(imageUrl);
					return () => {
						current = false;
					};
				}
				if (attachmentId === void 0 && libraryId === void 0) {
					setSrc(void 0);
					return () => {
						current = false;
					};
				}
				(libraryId === void 0 ? loadAvatar(attachmentId) : Promise.resolve(`${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(libraryId)}/avatar`)).then((url) => {
					if (!current) {
						if (url !== void 0) URL.revokeObjectURL(url);
						return;
					}
					objectUrl = url;
					setSrc(url);
				});
				return () => {
					current = false;
					if (objectUrl !== void 0) URL.revokeObjectURL(objectUrl);
				};
			}, [
				imageUrl,
				loadAvatar,
				projection.avatarAttachmentId,
				projection.avatarLibraryId
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					alignItems: "center",
					background: `color-mix(in srgb, ${color} 16%, transparent)`,
					border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
					borderRadius: "50%",
					color,
					display: "inline-flex",
					flex: `0 0 ${size}px`,
					fontSize: `${Math.max(13, Math.round(size * .36))}px`,
					fontWeight: 650,
					height: `${size}px`,
					justifyContent: "center",
					overflow: "hidden",
					width: `${size}px`
				},
				children: src === void 0 ? initials(projection.characterName) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					src,
					alt: "",
					style: {
						height: "100%",
						objectFit: "cover",
						width: "100%"
					}
				})
			});
		}
		function DetailSection({ title, text }) {
			if (text.trim() === "") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: { marginTop: "18px" },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					style: {
						fontSize: "12px",
						fontWeight: 600,
						margin: "0 0 7px",
						opacity: .56
					},
					children: title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						fontSize: "13px",
						lineHeight: 1.7,
						margin: 0,
						whiteSpace: "pre-wrap"
					},
					children: text
				})]
			});
		}
		function CharacterRemoteResourcesSection({ detail, onChange }) {
			const [workingOrigin, setWorkingOrigin] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			if (detail.remoteResourceOrigins.length === 0) return null;
			const approved = new Set(detail.approvedRemoteResourceOrigins);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					background: "var(--dsw-alias-bg-layer-1, #202024)",
					border: "1px solid var(--dsw-alias-border-l2, #39393c)",
					borderRadius: "10px",
					margin: "12px 0",
					overflow: "hidden"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { padding: "10px 11px 8px" },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: {
								display: "block",
								fontSize: "12px"
							},
							children: "外部资源"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								display: "block",
								fontSize: "10px",
								lineHeight: 1.5,
								marginTop: "3px",
								opacity: .5
							},
							children: "卡片引用了远程图片或界面文件；只允许你确认过的来源，并始终在隔离页面中运行"
						})]
					}),
					detail.remoteResourceOrigins.map((origin) => {
						const enabled = approved.has(origin);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								alignItems: "center",
								borderTop: "1px solid var(--dsw-alias-border-l2, #34343a)",
								display: "flex",
								gap: "9px",
								padding: "8px 11px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								title: origin,
								style: {
									fontSize: "11px",
									minWidth: 0,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: new URL(origin).hostname
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: workingOrigin !== void 0,
								onClick: () => {
									setWorkingOrigin(origin);
									setError(void 0);
									updateCharacterRemoteResource(detail.id, origin, !enabled).then((value) => {
										setWorkingOrigin(void 0);
										onChange?.(value);
									}, (reason) => {
										setWorkingOrigin(void 0);
										setError(reason instanceof Error ? reason.message : String(reason));
									});
								},
								style: {
									...miniButtonStyle,
									marginLeft: "auto"
								},
								children: workingOrigin === origin ? "处理中…" : enabled ? "停止加载" : "允许加载"
							})]
						}, origin);
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "alert",
						style: {
							color: "#e88989",
							fontSize: "11px",
							padding: "0 11px 9px"
						},
						children: error
					})
				]
			});
		}
		function CharacterAssetsSection({ detail, sessionId }) {
			const backgroundChoice = useRoleplayBackground(sessionId);
			const expressionChoice = useRoleplayExpression(sessionId);
			const backgrounds = backgroundAssets(detail);
			const expressions = detail.imageAssets.filter((asset) => asset.type === "emotion" || asset.type === "expression");
			if (backgrounds.length + expressions.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: { marginTop: "20px" },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						style: {
							fontSize: "12px",
							fontWeight: 620,
							margin: "0 0 9px",
							opacity: .58
						},
						children: "卡片资源"
					}),
					backgrounds.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							alignItems: "center",
							display: "flex",
							fontSize: "12px",
							marginBottom: "8px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { opacity: .64 },
							children: "背景"
						}), sessionId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							"aria-label": "选择会话背景",
							value: String(backgroundChoice),
							onChange: (event) => {
								const value = event.target.value;
								setRoleplayBackground(sessionId, value === "auto" || value === "off" ? value : Number(value));
							},
							style: {
								background: "var(--dsw-alias-bg-layer-1, #202024)",
								border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
								borderRadius: "7px",
								color: "inherit",
								font: "inherit",
								fontSize: "11px",
								marginLeft: "auto",
								padding: "5px 7px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "auto",
									children: "跟随角色卡"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "off",
									children: "不使用背景"
								}),
								backgrounds.map((asset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: asset.index,
									children: asset.name || `背景 ${asset.index + 1}`
								}, asset.index))
							]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "grid",
							gap: "7px",
							gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))"
						},
						children: backgrounds.map((asset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("figure", {
							style: {
								margin: 0,
								minWidth: 0
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								src: characterLibraryImageUrl(detail.id, asset.index),
								alt: asset.name || "角色背景",
								loading: "lazy",
								style: {
									aspectRatio: "16 / 9",
									border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
									borderRadius: "8px",
									display: "block",
									objectFit: "cover",
									width: "100%"
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("figcaption", {
								style: {
									fontSize: "10px",
									marginTop: "4px",
									opacity: .48,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: asset.name || `背景 ${asset.index + 1}`
							})]
						}, asset.index))
					})] }),
					expressions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							alignItems: "center",
							display: "flex",
							fontSize: "12px",
							margin: backgrounds.length === 0 ? "0 0 8px" : "16px 0 8px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { opacity: .64 },
							children: "表情资源"
						}), sessionId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setRoleplayExpression(sessionId, "default");
							},
							style: {
								background: expressionChoice === "default" ? `color-mix(in srgb, ${color} 14%, transparent)` : "transparent",
								border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
								borderRadius: "7px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "10px",
								marginLeft: "auto",
								padding: "4px 7px"
							},
							children: "默认头像"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "grid",
							gap: "7px",
							gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))"
						},
						children: expressions.map((asset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-label": `使用表情 ${asset.name || asset.index + 1}`,
							"aria-pressed": sessionId !== void 0 && expressionChoice === asset.index,
							disabled: sessionId === void 0,
							onClick: () => {
								if (sessionId !== void 0) setRoleplayExpression(sessionId, asset.index);
							},
							style: {
								background: sessionId !== void 0 && expressionChoice === asset.index ? `color-mix(in srgb, ${color} 14%, transparent)` : "transparent",
								border: sessionId !== void 0 && expressionChoice === asset.index ? `1px solid color-mix(in srgb, ${color} 48%, transparent)` : "1px solid transparent",
								borderRadius: "9px",
								color: "inherit",
								cursor: sessionId === void 0 ? "default" : "pointer",
								font: "inherit",
								margin: 0,
								minWidth: 0,
								padding: "3px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								src: characterLibraryImageUrl(detail.id, asset.index),
								alt: asset.name || "角色表情",
								loading: "lazy",
								style: {
									aspectRatio: "1",
									background: "color-mix(in srgb, currentColor 5%, transparent)",
									border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
									borderRadius: "8px",
									display: "block",
									objectFit: "contain",
									width: "100%"
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("figcaption", {
								style: {
									fontSize: "10px",
									marginTop: "4px",
									opacity: .48,
									overflow: "hidden",
									textAlign: "center",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: asset.name || `表情 ${asset.index + 1}`
							})]
						}, asset.index))
					})] })
				]
			});
		}
		function regexPlacementLabel(value) {
			switch (value) {
				case 0: return "旧式 Markdown";
				case 1: return "用户消息";
				case 2: return "角色回复";
				case 3: return "斜杠命令";
				case 4: return "旧式发送";
				case 5: return "世界书";
				case 6: return "推理内容";
				default: return `位置 ${value}`;
			}
		}
		function regexStateLabel(script) {
			switch (script.state) {
				case "active": return "可运行";
				case "partial": return "部分兼容";
				case "disabled": return "卡内已停用";
				case "unsupported": return "当前位置未接管";
				case "invalid": return "表达式无效";
			}
		}
		function CharacterRegexScriptsSection({ scripts, promptRegex }) {
			const [open, setOpen] = (0, react.useState)(false);
			const enabled = scripts.filter((script) => script.enabled).length;
			const warnings = scripts.filter((script) => script.state === "partial" || script.state === "unsupported" || script.state === "invalid").length;
			const traceByIndex = new Map(promptRegex?.scripts.filter((script) => script.source === "character").map((script) => [script.index, script]));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
				open,
				onToggle: (event) => {
					setOpen(event.currentTarget.open);
				},
				style: {
					background: "var(--dsw-alias-bg-layer-1, #202024)",
					border: "1px solid var(--dsw-alias-border-l2, #39393c)",
					borderRadius: "10px",
					margin: "4px 0 12px",
					overflow: "hidden"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", {
					style: {
						alignItems: "center",
						cursor: "pointer",
						display: "flex",
						gap: "9px",
						listStyle: "none",
						padding: "10px 11px"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: "12px",
								fontWeight: 650
							},
							children: "角色卡正则"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: "10px",
								opacity: .5
							},
							children: scripts.length === 0 ? "无内置脚本" : `${enabled}/${scripts.length} 条启用`
						}),
						warnings > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								color: "#d9a85f",
								fontSize: "10px",
								marginLeft: "auto"
							},
							children: [warnings, " 条需留意"]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DisclosureChevron, { expanded: open })
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						borderTop: "1px solid var(--dsw-alias-border-l2, #39393c)",
						padding: "4px 11px 10px"
					},
					children: [scripts.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: "11px",
							lineHeight: 1.55,
							opacity: .5,
							paddingTop: "7px"
						},
						children: "这张角色卡没有自带正则脚本"
					}), scripts.map((script) => {
						const trace = traceByIndex.get(script.index);
						const target = script.display && script.prompt ? "显示与生成" : script.display ? "界面显示" : script.prompt ? "生成提示" : "无目标";
						const traceLabel = trace === void 0 ? void 0 : trace.outcome === "applied" ? `上次命中 ${trace.affectedMessages} 条消息` : trace.outcome === "no-match" ? "上次未命中" : trace.outcome === "display-only" ? "仅用于显示" : trace.outcome === "placement" ? "上次消息位置不匹配" : trace.outcome === "depth" ? "上次深度不匹配" : trace.outcome === "disabled" ? "上次未启用" : "表达式无效";
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								borderTop: script.index === 0 ? 0 : "1px solid var(--dsw-alias-border-l2, #34343a)",
								padding: "8px 0 7px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										alignItems: "baseline",
										display: "flex",
										gap: "8px"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										title: script.scriptName,
										style: {
											fontSize: "11px",
											fontWeight: 620,
											minWidth: 0,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: script.scriptName || `未命名脚本 ${script.index + 1}`
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											color: script.state === "active" || script.state === "disabled" ? "inherit" : "#d9a85f",
											flex: "none",
											fontSize: "10px",
											marginLeft: "auto",
											opacity: script.state === "active" ? .58 : .82
										},
										children: regexStateLabel(script)
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "10px",
										lineHeight: 1.5,
										marginTop: "3px",
										opacity: .46
									},
									children: [
										target,
										script.placement.map(regexPlacementLabel).join("、") || "未设置消息位置",
										script.minDepth === null && script.maxDepth === null ? void 0 : `深度 ${script.minDepth ?? "不限"}–${script.maxDepth ?? "不限"}`,
										script.runOnEdit ? "编辑时也运行" : void 0
									].filter(Boolean).join(" · ")
								}),
								traceLabel !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "10px",
										marginTop: "3px",
										opacity: .58
									},
									children: traceLabel
								})
							]
						}, script.index);
					})]
				})]
			});
		}
		function inspectDisplayExtension(file) {
			if (file.size === 0 || file.size > 256 * 1024) return Promise.reject(/* @__PURE__ */ new Error("显示扩展文件为空或过大"));
			return file.text().then((source) => {
				let value;
				try {
					value = JSON.parse(source.replace(/^\uFEFF/u, ""));
				} catch (error) {
					throw new Error("显示扩展不是有效 JSON", { cause: error });
				}
				if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("显示扩展必须是一个正则对象");
				const record = value;
				if (typeof record.scriptName !== "string" || record.scriptName.trim() === "" || typeof record.replaceString !== "string" || record.markdownOnly !== true || record.promptOnly === true || !Array.isArray(record.placement) || !record.placement.includes(2)) throw new Error("这里只接受作用于 AI 消息的纯显示正则");
				const origins = /* @__PURE__ */ new Set();
				for (const match of record.replaceString.matchAll(/<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/giu)) {
					const sourceUrl = match[1] ?? match[2] ?? match[3];
					if (sourceUrl === void 0 || !/^https:\/\//iu.test(sourceUrl)) continue;
					origins.add(new URL(sourceUrl).origin);
				}
				return {
					file,
					scriptName: record.scriptName.trim(),
					imageOrigins: [...origins].sort()
				};
			});
		}
		async function updateCharacterDisplayExtension(characterId, extensionId, operation) {
			const response = await fetch(`${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(characterId)}/display-extensions/${encodeURIComponent(extensionId)}/${operation}`, {
				method: "POST",
				headers: { accept: "application/json" }
			});
			const value = await response.json();
			if (!response.ok || value.entry === void 0) throw new Error(value.error ?? `显示扩展更新失败（${response.status}）`);
			return value.entry;
		}
		async function uploadCharacterDisplayExtension(characterId, pending) {
			const query = new URLSearchParams({
				filename: pending.file.name,
				approvedOrigins: JSON.stringify(pending.imageOrigins)
			});
			const response = await fetch(`${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(characterId)}/display-extensions/import?${query}`, {
				method: "POST",
				headers: {
					accept: "application/json",
					"content-type": pending.file.type || "application/json"
				},
				body: pending.file
			});
			const value = await response.json();
			if (!response.ok || value.entry === void 0) throw new Error(value.error ?? `显示扩展导入失败（${response.status}）`);
			return value.entry;
		}
		function CharacterDisplayExtensionsSection({ detail, onChange, onNotice, onError }) {
			const inputRef = (0, react.useRef)(null);
			const [pending, setPending] = (0, react.useState)();
			const [working, setWorking] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				setPending(void 0);
				setWorking(false);
			}, [detail.id]);
			const install = (value) => {
				setWorking(true);
				uploadCharacterDisplayExtension(detail.id, value).then((entry) => {
					onChange(entry);
					onNotice(`已启用显示扩展「${value.scriptName}」`);
					setPending(void 0);
					setWorking(false);
				}, (reason) => {
					setWorking(false);
					onError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			const select = (file) => {
				onError("");
				inspectDisplayExtension(file).then((value) => {
					if (value.imageOrigins.length === 0) install(value);
					else setPending(value);
				}, (reason) => {
					onError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			const mutate = (extensionId, operation) => {
				setWorking(true);
				updateCharacterDisplayExtension(detail.id, extensionId, operation).then((entry) => {
					onChange(entry);
					onNotice(operation === "remove" ? "已移除显示扩展" : operation === "enable" ? "已启用显示扩展" : "已停用显示扩展");
					setWorking(false);
				}, (reason) => {
					setWorking(false);
					onError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					background: "var(--dsw-alias-bg-layer-1, #202024)",
					border: "1px solid var(--dsw-alias-border-l2, #39393c)",
					borderRadius: "10px",
					margin: "4px 0 14px",
					padding: "10px 11px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							alignItems: "center",
							display: "flex",
							gap: "10px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { minWidth: 0 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: {
										display: "block",
										fontSize: "12px"
									},
									children: "附加显示正则"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										display: "block",
										fontSize: "10px",
										marginTop: "2px",
										opacity: .5
									},
									children: "卡外单独导入，只改变界面显示"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: inputRef,
								type: "file",
								accept: ".json,application/json",
								hidden: true,
								onChange: (event) => {
									const file = event.target.files?.[0];
									event.target.value = "";
									if (file !== void 0) select(file);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: working,
								onClick: () => {
									inputRef.current?.click();
								},
								style: {
									background: "transparent",
									border: `1px solid color-mix(in srgb, ${color} 42%, transparent)`,
									borderRadius: "7px",
									color,
									cursor: working ? "wait" : "pointer",
									font: "inherit",
									fontSize: "11px",
									marginLeft: "auto",
									padding: "5px 8px",
									whiteSpace: "nowrap"
								},
								children: "＋ 添加"
							})
						]
					}),
					detail.displayExtensions.length === 0 && pending === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: "11px",
							lineHeight: 1.55,
							marginTop: "8px",
							opacity: .52
						},
						children: "暂无附加显示规则"
					}),
					detail.displayExtensions.map((extension) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							alignItems: "center",
							borderTop: "1px solid var(--dsw-alias-border-l2, #39393c)",
							display: "flex",
							gap: "8px",
							marginTop: "9px",
							paddingTop: "9px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									flex: 1,
									minWidth: 0
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										fontSize: "11px",
										fontWeight: 620,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: [extension.scriptName, extension.enabled ? "" : " · 已停用"]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										fontSize: "10px",
										lineHeight: 1.5,
										marginTop: "2px",
										opacity: .5
									},
									children: [extension.remoteImageOrigins.length === 0 ? "本地显示" : `外部图片 · ${extension.remoteImageOrigins.map((origin) => new URL(origin).hostname).join("、")}`, extension.replacedCardRegexNames.length === 0 ? "" : ` · 已修复旧规则 ${extension.replacedCardRegexNames.join("、")}`]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: working,
								onClick: () => {
									mutate(extension.id, extension.enabled ? "disable" : "enable");
								},
								style: {
									background: "transparent",
									border: 0,
									color,
									cursor: working ? "wait" : "pointer",
									font: "inherit",
									fontSize: "10px",
									padding: "3px"
								},
								children: extension.enabled ? "停用" : "启用"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: working,
								onClick: () => {
									mutate(extension.id, "remove");
								},
								style: {
									background: "transparent",
									border: 0,
									color: "inherit",
									cursor: working ? "wait" : "pointer",
									font: "inherit",
									fontSize: "10px",
									opacity: .5,
									padding: "3px"
								},
								children: "移除"
							})
						]
					}, extension.id)),
					pending !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							background: "color-mix(in srgb, #d6a24d 9%, transparent)",
							border: "1px solid color-mix(in srgb, #d6a24d 35%, transparent)",
							borderRadius: "8px",
							fontSize: "11px",
							lineHeight: 1.55,
							marginTop: "9px",
							padding: "9px 10px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", {
								style: { display: "block" },
								children: [pending.scriptName, " 需要加载外部图片"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									display: "block",
									marginTop: "2px",
									opacity: .68
								},
								children: [pending.imageOrigins.map((origin) => new URL(origin).hostname).join("、"), " 会在显示图片时看到你的网络地址。授权只属于这张角色卡。"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: "10px",
									marginTop: "7px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: working,
									onClick: () => {
										install(pending);
									},
									style: {
										background: color,
										border: 0,
										borderRadius: "7px",
										color: "#fff",
										cursor: working ? "wait" : "pointer",
										font: "inherit",
										fontSize: "11px",
										padding: "5px 9px"
									},
									children: working ? "正在添加…" : "允许并添加"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: working,
									onClick: () => {
										setPending(void 0);
									},
									style: {
										background: "transparent",
										border: 0,
										color: "inherit",
										cursor: "pointer",
										font: "inherit",
										fontSize: "11px",
										opacity: .6,
										padding: "5px 2px"
									},
									children: "取消"
								})]
							})
						]
					})
				]
			});
		}
		function CharacterLibraryAvatar({ entry, size = 38 }) {
			const [failed, setFailed] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				setFailed(false);
			}, [entry.id]);
			const image = entry.avatarAvailable && !failed;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-hidden": "true",
				style: {
					alignItems: "center",
					background: `color-mix(in srgb, ${color} 13%, transparent)`,
					border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
					borderRadius: `${Math.max(9, Math.round(size * .24))}px`,
					color,
					display: "inline-flex",
					flex: `0 0 ${size}px`,
					fontSize: `${Math.max(12, Math.round(size * .32))}px`,
					fontWeight: 650,
					height: `${size}px`,
					justifyContent: "center",
					overflow: "hidden",
					width: `${size}px`
				},
				children: image ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					src: `${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(entry.id)}/avatar`,
					alt: "",
					loading: "lazy",
					onError: () => {
						setFailed(true);
					},
					style: {
						height: "100%",
						objectFit: "cover",
						width: "100%"
					}
				}) : initials(entry.displayName)
			});
		}
		const characterLibraryNarrowQuery = "(max-width: 720px)";
		const agentRpResponsiveStyle = `
.agent-rp-mobile-only { display: none !important; }
@media (max-width: 720px) {
  .agent-rp-header {
    flex: 1 1 auto !important;
    gap: 6px !important;
    margin-right: 0 !important;
    width: 100%;
  }
  .agent-rp-header-meta { flex: 1 1 auto; }
  .agent-rp-header-kind,
  .agent-rp-header-capabilities,
  .agent-rp-header-primary-action { display: none !important; }
  .agent-rp-header-settings { flex: 0 0 auto; margin-left: auto; }
  .agent-rp-mobile-only { display: block !important; }
  [data-agent-rp-dialog] {
    align-items: flex-end !important;
    padding: max(8px, env(safe-area-inset-top)) 0 0 !important;
  }
  [data-agent-rp-dialog] > section {
    border-bottom: 0 !important;
    border-radius: 16px 16px 0 0 !important;
    box-sizing: border-box !important;
    max-height: calc(100dvh - max(8px, env(safe-area-inset-top))) !important;
    max-width: 100vw !important;
    padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
    width: 100vw !important;
  }
  .agent-rp-character-library-dialog {
    border-radius: 0 !important;
    height: 100dvh !important;
    max-height: 100dvh !important;
  }
  .agent-rp-character-info {
    border-left: 0 !important;
    box-sizing: border-box !important;
    height: 100dvh;
    max-width: 100vw !important;
    padding: max(18px, env(safe-area-inset-top)) 18px max(18px, env(safe-area-inset-bottom)) !important;
    width: 100vw !important;
  }
  .agent-rp-tavern-script-dialog {
    border-radius: 0 !important;
    height: 100dvh !important;
    max-height: 100dvh !important;
  }
}
`;
		function subscribeCharacterLibraryWidth(listener) {
			const media = window.matchMedia(characterLibraryNarrowQuery);
			media.addEventListener("change", listener);
			return () => {
				media.removeEventListener("change", listener);
			};
		}
		function useNarrowCharacterLibrary() {
			return (0, react.useSyncExternalStore)(subscribeCharacterLibraryWidth, () => window.matchMedia(characterLibraryNarrowQuery).matches, () => false);
		}
		function SillyTavernImportDialog({ listPresets, onClose, onImport, onImportRpDistribution }) {
			const chatRef = (0, react.useRef)(null);
			const cardRef = (0, react.useRef)(null);
			const [chatFile, setChatFile] = (0, react.useState)();
			const [cardFile, setCardFile] = (0, react.useState)();
			const [sourceMode, setSourceMode] = (0, react.useState)("jsonl");
			const [rpTarget, setRpTarget] = (0, react.useState)(initialRpDistributionTarget);
			const [rpSessionId, setRpSessionId] = (0, react.useState)("");
			const { entries: presets, error: presetError, presetId, selectPreset } = usePresetPreference(listPresets);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-dialog": true,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "迁移 SillyTavern 聊天",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.66)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1250
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget && !busy) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #151518)",
						border: "1px solid var(--dsw-alias-border-l2, #38383d)",
						borderRadius: "16px",
						boxShadow: "0 24px 80px rgba(0,0,0,.5)",
						maxWidth: "520px",
						padding: "24px",
						width: "min(94vw, 520px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							style: {
								fontSize: "17px",
								margin: 0
							},
							children: "迁移聊天"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								fontSize: "13px",
								lineHeight: 1.65,
								margin: "9px 0 20px",
								opacity: .58
							},
							children: "从 SillyTavern JSONL 或本机模块化 RP 会话创建一段可以继续的新会话"
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							style: {
								color: "#e47a7a",
								fontSize: "12px",
								margin: "0 0 12px"
							},
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							ref: chatRef,
							type: "file",
							accept: ".jsonl,application/x-ndjson",
							hidden: true,
							onChange: (event) => {
								const file = event.currentTarget.files?.[0];
								event.currentTarget.value = "";
								if (file !== void 0) setChatFile(file);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							ref: cardRef,
							type: "file",
							accept: ".png,.json,.charx,image/png,application/json",
							hidden: true,
							onChange: (event) => {
								const file = event.currentTarget.files?.[0];
								event.currentTarget.value = "";
								if (file !== void 0) setCardFile(file);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gap: "8px",
								gridTemplateColumns: "1fr 1fr",
								marginBottom: "14px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								"aria-pressed": sourceMode === "jsonl",
								onClick: () => {
									setSourceMode("jsonl");
								},
								style: sourceMode === "jsonl" ? primaryButtonStyle : secondaryButtonStyle,
								children: "SillyTavern JSONL"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								"aria-pressed": sourceMode === "rp-distribution",
								onClick: () => {
									setSourceMode("rp-distribution");
								},
								style: sourceMode === "rp-distribution" ? primaryButtonStyle : secondaryButtonStyle,
								children: "模块化 RP 会话"
							})]
						}),
						sourceMode === "jsonl" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gap: "8px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: () => {
									chatRef.current?.click();
								},
								style: {
									...secondaryButtonStyle,
									textAlign: "left"
								},
								children: chatFile === void 0 ? "选择聊天记录 JSONL" : `聊天记录 · ${chatFile.name}`
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: () => {
									cardRef.current?.click();
								},
								style: {
									...secondaryButtonStyle,
									textAlign: "left"
								},
								children: cardFile === void 0 ? "选择角色卡（可选）" : `角色卡 · ${cardFile.name}`
							})]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gap: "10px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										display: "grid",
										fontSize: "12px",
										gap: "6px"
									},
									children: ["模块化 RP 地址", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: rpTarget,
										onChange: (event) => {
											setRpTarget(event.target.value);
										},
										placeholder: "http://127.0.0.1:3092",
										style: settingsFieldStyle
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										display: "grid",
										fontSize: "12px",
										gap: "6px"
									},
									children: ["原会话 ID", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: rpSessionId,
										onChange: (event) => {
											setRpSessionId(event.target.value);
										},
										placeholder: "session-…",
										style: settingsFieldStyle
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										fontSize: "11px",
										lineHeight: 1.55,
										margin: 0,
										opacity: .5
									},
									children: "原会话需要仍在本机模块化 RP 中可读取；迁移不会修改它"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: {
								display: "block",
								fontSize: "12px",
								fontWeight: 620,
								marginTop: "16px",
								opacity: .68
							},
							children: ["对话预设", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								"aria-label": "迁移对话预设",
								value: presetId,
								onChange: (event) => {
									selectPreset(event.target.value);
								},
								style: {
									background: "var(--dsw-alias-bg-layer-1, #202024)",
									border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
									borderRadius: "9px",
									boxSizing: "border-box",
									color: "inherit",
									display: "block",
									font: "inherit",
									marginTop: "7px",
									padding: "9px 10px",
									width: "100%"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: "不使用预设"
								}), presets?.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: entry.id,
									children: presetLibraryOptionLabel(entry, presets)
								}, entry.id))]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: "11px",
								lineHeight: 1.55,
								marginTop: "6px",
								opacity: .5
							},
							children: presetError !== void 0 ? presetError : presets === void 0 ? "正在读取预设…" : presets.length === 0 ? "预设库暂无内容" : (() => {
								const preset = presets.find((entry) => entry.id === presetId);
								return preset === void 0 ? "迁移后的会话不启用酒馆预设" : `${preset.enabledCount}/${preset.promptCount} 项启用${preset.regexScriptCount === 0 ? "" : ` · ${preset.regexScriptCount} 条正则`}`;
							})()
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "9px",
								justifyContent: "flex-end",
								marginTop: "22px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: onClose,
								style: secondaryButtonStyle,
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy || (sourceMode === "jsonl" ? chatFile === void 0 : rpTarget.trim() === "" || rpSessionId.trim() === ""),
								onClick: () => {
									setBusy(true);
									setError(void 0);
									const selectedPreset = presetId === "" ? void 0 : presetId;
									(sourceMode === "jsonl" ? onImport(chatFile, cardFile, selectedPreset) : onImportRpDistribution(rpTarget, rpSessionId, selectedPreset)).then(onClose, (reason) => {
										setError(reason instanceof Error ? reason.message : String(reason));
										setBusy(false);
									});
								},
								style: primaryButtonStyle,
								children: busy ? "正在迁移…" : "创建新会话"
							})]
						})
					]
				})
			});
		}
		function PersonaManagerDialog({ current, listPersonas, savePersona, deletePersona, onApply, onClose }) {
			const [entries, setEntries] = (0, react.useState)();
			const [selectedId, setSelectedId] = (0, react.useState)(current?.id ?? "");
			const [editingId, setEditingId] = (0, react.useState)();
			const [editing, setEditing] = (0, react.useState)(false);
			const [name, setName] = (0, react.useState)("");
			const [description, setDescription] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)();
			const [confirmDelete, setConfirmDelete] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			(0, react.useEffect)(() => {
				let active = true;
				listPersonas().then((value) => {
					if (active) setEntries(value);
				}, (reason) => {
					if (active) setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					active = false;
				};
			}, [listPersonas]);
			const selected = entries?.find((entry) => entry.id === selectedId) ?? (current?.id === selectedId ? current : void 0);
			const edit = (persona) => {
				setEditing(true);
				setEditingId(persona?.id);
				setName(persona?.name ?? "");
				setDescription(persona?.description ?? "");
				setConfirmDelete(false);
				setError(void 0);
			};
			const apply = (persona) => {
				setBusy("apply");
				setError(void 0);
				onApply(persona).then(onClose, (reason) => {
					setBusy(void 0);
					setError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-dialog": true,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "管理你的身份",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.58)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1220
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget && busy === void 0) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #171719)",
						border: "1px solid var(--dsw-alias-border-l2, #39393c)",
						borderRadius: "16px",
						boxShadow: "0 24px 80px rgba(0,0,0,.42)",
						maxHeight: "min(720px, calc(100vh - 36px))",
						overflowY: "auto",
						padding: "22px",
						width: "min(94vw, 520px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								alignItems: "center",
								display: "flex",
								gap: "12px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								style: {
									fontSize: "18px",
									margin: 0
								},
								children: "你的身份"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "12px",
									lineHeight: 1.55,
									margin: "6px 0 0",
									opacity: .55
								},
								children: "更改从下一次回复开始生效，不会改写已有聊天"
							})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "关闭身份管理",
								disabled: busy !== void 0,
								onClick: onClose,
								style: {
									background: "transparent",
									border: 0,
									color: "inherit",
									cursor: "pointer",
									fontSize: "23px",
									marginLeft: "auto",
									padding: "4px"
								},
								children: "×"
							})]
						}),
						current === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								background: "var(--dsw-alias-bg-layer-1, #202024)",
								borderRadius: "10px",
								fontSize: "12px",
								lineHeight: 1.6,
								marginTop: "18px",
								opacity: .62,
								padding: "11px 12px"
							},
							children: "当前会话没有设置 Persona"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								background: `color-mix(in srgb, ${color} 11%, transparent)`,
								border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
								borderRadius: "10px",
								marginTop: "18px",
								padding: "11px 12px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "11px",
										opacity: .5
									},
									children: "当前会话"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: {
										display: "block",
										fontSize: "14px",
										marginTop: "3px"
									},
									children: current.name
								}),
								current.description !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "12px",
										lineHeight: 1.6,
										marginTop: "5px",
										opacity: .62,
										whiteSpace: "pre-wrap"
									},
									children: current.description
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								alignItems: "center",
								display: "flex",
								marginTop: "18px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "agent-rp-persona-manager-select",
								style: {
									fontSize: "12px",
									fontWeight: 620,
									opacity: .64
								},
								children: "选择已保存的身份"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									edit();
								},
								style: {
									background: "transparent",
									border: 0,
									color,
									cursor: "pointer",
									font: "inherit",
									fontSize: "12px",
									marginLeft: "auto",
									padding: 0
								},
								children: "新建"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							id: "agent-rp-persona-manager-select",
							value: selectedId,
							disabled: entries === void 0 || busy !== void 0,
							onChange: (event) => {
								setSelectedId(event.target.value);
								setConfirmDelete(false);
							},
							style: {
								background: "var(--dsw-alias-bg-layer-1, #202024)",
								border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
								borderRadius: "9px",
								boxSizing: "border-box",
								color: "inherit",
								font: "inherit",
								marginTop: "7px",
								padding: "9px 10px",
								width: "100%"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: entries === void 0 ? "正在读取…" : entries.length === 0 ? "还没有保存的身份" : "选择身份"
								}),
								entries?.map((persona) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: persona.id,
									children: persona.name
								}, persona.id)),
								current !== void 0 && entries?.some((persona) => persona.id === current.id) === false && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: current.id,
									children: [current.name, "（会话快照）"]
								})
							]
						}),
						selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { marginTop: "8px" },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: "12px",
									lineHeight: 1.6,
									opacity: .58,
									whiteSpace: "pre-wrap"
								},
								children: selected.description || "只有称呼，没有额外人物设定"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: "12px",
									marginTop: "8px"
								},
								children: [
									entries?.some((entry) => entry.id === selected.id) === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											edit(selected);
										},
										style: {
											background: "transparent",
											border: 0,
											color,
											cursor: "pointer",
											font: "inherit",
											fontSize: "11px",
											padding: 0
										},
										children: "编辑"
									}),
									entries?.some((entry) => entry.id === selected.id) === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: busy !== void 0,
										onClick: () => {
											if (!confirmDelete) {
												setConfirmDelete(true);
												return;
											}
											setBusy("delete");
											setError(void 0);
											deletePersona(selected.id).then(() => {
												setEntries((value) => (value ?? []).filter((entry) => entry.id !== selected.id));
												setSelectedId(current?.id === selected.id ? current.id : "");
												setConfirmDelete(false);
												setBusy(void 0);
											}, (reason) => {
												setBusy(void 0);
												setError(reason instanceof Error ? reason.message : String(reason));
											});
										},
										style: {
											background: "transparent",
											border: 0,
											color: confirmDelete ? "#e88989" : "inherit",
											cursor: "pointer",
											font: "inherit",
											fontSize: "11px",
											opacity: confirmDelete ? 1 : .48,
											padding: 0
										},
										children: busy === "delete" ? "正在移除…" : confirmDelete ? "确认从身份库移除" : "从身份库移除"
									}),
									confirmDelete && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setConfirmDelete(false);
										},
										style: {
											background: "transparent",
											border: 0,
											color: "inherit",
											cursor: "pointer",
											font: "inherit",
											fontSize: "11px",
											opacity: .48,
											padding: 0
										},
										children: "取消"
									})
								]
							})]
						}),
						editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								background: "var(--dsw-alias-bg-layer-1, #202024)",
								border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
								borderRadius: "10px",
								display: "grid",
								gap: "9px",
								marginTop: "14px",
								padding: "11px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: name,
									maxLength: 120,
									placeholder: "称呼（角色会这样称呼你）",
									onChange: (event) => {
										setName(event.target.value);
									},
									style: {
										background: "transparent",
										border: "1px solid var(--dsw-alias-border-l2, #414147)",
										borderRadius: "8px",
										boxSizing: "border-box",
										color: "inherit",
										font: "inherit",
										padding: "8px 9px",
										width: "100%"
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: description,
									maxLength: 12e3,
									rows: 4,
									placeholder: "身份、外貌、性格，或你与角色的关系",
									onChange: (event) => {
										setDescription(event.target.value);
									},
									style: {
										background: "transparent",
										border: "1px solid var(--dsw-alias-border-l2, #414147)",
										borderRadius: "8px",
										boxSizing: "border-box",
										color: "inherit",
										font: "inherit",
										lineHeight: 1.55,
										padding: "8px 9px",
										resize: "vertical",
										width: "100%"
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: "8px",
										justifyContent: "flex-end"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setEditing(false);
											setEditingId(void 0);
											setName("");
											setDescription("");
										},
										style: {
											background: "transparent",
											border: "1px solid var(--dsw-alias-border-l2, #444)",
											borderRadius: "8px",
											color: "inherit",
											cursor: "pointer",
											font: "inherit",
											padding: "7px 10px"
										},
										children: "取消编辑"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: busy !== void 0 || name.trim() === "",
										onClick: () => {
											setBusy("save");
											setError(void 0);
											savePersona({
												format: 0,
												...editingId === void 0 ? {} : { id: editingId },
												name,
												description
											}).then((entry) => {
												setEntries((value) => [entry, ...(value ?? []).filter((item) => item.id !== entry.id)]);
												setSelectedId(entry.id);
												setEditing(false);
												setEditingId(void 0);
												setName("");
												setDescription("");
												setBusy(void 0);
												apply({
													id: entry.id,
													name: entry.name,
													description: entry.description
												});
											}, (reason) => {
												setBusy(void 0);
												setError(reason instanceof Error ? reason.message : String(reason));
											});
										},
										style: {
											background: color,
											border: 0,
											borderRadius: "8px",
											color: "#fff",
											cursor: "pointer",
											font: "inherit",
											opacity: name.trim() === "" ? .45 : 1,
											padding: "7px 11px"
										},
										children: busy === "save" ? "正在保存…" : "保存并应用"
									})]
								})
							]
						}) : null,
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							style: {
								color: "#e88989",
								fontSize: "12px",
								lineHeight: 1.55,
								margin: "12px 0 0"
							},
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							style: {
								borderTop: "1px solid var(--dsw-alias-border-l2, #39393c)",
								display: "flex",
								gap: "9px",
								justifyContent: "flex-end",
								marginTop: "20px",
								paddingTop: "14px"
							},
							children: [
								current !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy !== void 0,
									onClick: () => {
										apply();
									},
									style: {
										background: "transparent",
										border: "1px solid var(--dsw-alias-border-l2, #444)",
										borderRadius: "9px",
										color: "inherit",
										cursor: "pointer",
										font: "inherit",
										marginRight: "auto",
										padding: "8px 12px"
									},
									children: "清除当前身份"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy !== void 0,
									onClick: onClose,
									style: {
										background: "transparent",
										border: "1px solid var(--dsw-alias-border-l2, #444)",
										borderRadius: "9px",
										color: "inherit",
										cursor: "pointer",
										font: "inherit",
										padding: "8px 12px"
									},
									children: "关闭"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: selected === void 0 || busy !== void 0,
									onClick: () => {
										if (selected !== void 0) apply({
											id: selected.id,
											name: selected.name,
											description: selected.description
										});
									},
									style: {
										background: color,
										border: 0,
										borderRadius: "9px",
										color: "#fff",
										cursor: "pointer",
										font: "inherit",
										opacity: selected === void 0 ? .45 : 1,
										padding: "8px 13px"
									},
									children: busy === "apply" ? "正在应用…" : "应用到本会话"
								})
							]
						})
					]
				})
			});
		}
		function BlankRoleplayLauncher({ session, sessionId, listCharacters, readCharacter, setCharacterArchived, importCharacterFile, migrateChat, migrateRpDistributionChat, startCharacterSession, listPresets, importPresetFile, listPersonas, savePersona, deletePersona, workspaceSettings, workspaceList }) {
			const [libraryOpen, setLibraryOpen] = (0, react.useState)(false);
			const [migrationOpen, setMigrationOpen] = (0, react.useState)(false);
			const settingsSnapshot = (0, react.useSyncExternalStore)(workspaceSettings.subscribe, workspaceSettings.getSnapshot, workspaceSettings.getSnapshot);
			const workspace = (0, react.useSyncExternalStore)(workspaceList.subscribe, workspaceList.getSnapshot, workspaceList.getSnapshot).items.find((item) => item.sessionIds.includes(sessionId));
			if (!session.blank || !allowsAgentRpEntry(settingsSnapshot.value, workspace?.workspaceId)) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						setLibraryOpen(true);
					},
					style: {
						alignItems: "center",
						background: `color-mix(in srgb, ${color} 14%, transparent)`,
						border: `1px solid color-mix(in srgb, ${color} 34%, transparent)`,
						borderRadius: "8px",
						color: "inherit",
						cursor: "pointer",
						display: "inline-flex",
						font: "inherit",
						fontSize: "12px",
						fontWeight: 620,
						gap: "6px",
						padding: "5px 9px",
						whiteSpace: "nowrap"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						style: {
							color,
							fontSize: "15px",
							lineHeight: 1
						},
						children: "✦"
					}), "选择角色"]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						setMigrationOpen(true);
					},
					style: {
						background: "transparent",
						border: "1px solid var(--dsw-alias-border-l2, #444)",
						borderRadius: "8px",
						color: "inherit",
						cursor: "pointer",
						font: "inherit",
						fontSize: "12px",
						padding: "5px 9px",
						whiteSpace: "nowrap"
					},
					children: "迁移聊天"
				}),
				libraryOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterLibraryDialog, {
					currentCharacterName: "",
					listCharacters,
					readCharacter,
					setCharacterArchived,
					importCharacterFile,
					onClose: () => {
						setLibraryOpen(false);
					},
					onStart: (character, greetingIndex, persona, presetId) => startCharacterSession(sessionId, character, greetingIndex, persona, presetId),
					listPresets,
					importPresetFile,
					listPersonas,
					savePersona,
					deletePersona
				}),
				migrationOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SillyTavernImportDialog, {
					listPresets,
					onClose: () => {
						setMigrationOpen(false);
					},
					onImport: (chatFile, cardFile, presetId) => migrateChat(sessionId, chatFile, cardFile, presetId),
					onImportRpDistribution: (target, remoteSessionId, presetId) => migrateRpDistributionChat(sessionId, target, remoteSessionId, presetId)
				})
			] });
		}
		const settingsFieldStyle = {
			background: "var(--dsw-alias-bg-layer-1, #202024)",
			border: "1px solid var(--dsw-alias-border-l2, #3d3d43)",
			borderRadius: "8px",
			boxSizing: "border-box",
			color: "inherit",
			font: "inherit",
			fontSize: "12px",
			minWidth: 0,
			padding: "8px 9px",
			width: "100%"
		};
		function copyToolGuidance(value) {
			return {
				enabled: value.enabled,
				includeFramework: value.includeFramework,
				includeAgentRp: value.includeAgentRp,
				imageMode: value.imageMode,
				custom: value.custom.map((entry) => ({ ...entry }))
			};
		}
		function nextToolGuidanceId(entries) {
			const ids = new Set(entries.map((entry) => entry.id.trim().toLowerCase()));
			let suffix = 1;
			while (ids.has(`custom-${suffix}`)) suffix += 1;
			return `custom-${suffix}`;
		}
		function ToolGuidanceSettingsPanel({ settings, writable, onSave }) {
			const [draft, setDraft] = (0, react.useState)(() => copyToolGuidance(settings.toolGuidance));
			(0, react.useEffect)(() => {
				setDraft(copyToolGuidance(settings.toolGuidance));
			}, [settings.toolGuidance]);
			const dirty = JSON.stringify(draft) !== JSON.stringify(settings.toolGuidance);
			const normalizedIds = draft.custom.map((entry) => entry.id.trim());
			const validationError = draft.custom.some((entry) => entry.id.trim() === "") ? "自定义条目的 ID 不能为空" : draft.custom.some((entry) => entry.text.trim() === "") ? "自定义提示词不能为空" : new Set(normalizedIds).size !== normalizedIds.length ? "自定义条目的 ID 不能重复" : void 0;
			const checkboxStyle = {
				alignItems: "flex-start",
				cursor: writable ? "pointer" : "default",
				display: "flex",
				fontSize: "12px",
				gap: "9px",
				lineHeight: 1.5
			};
			const save = () => {
				if (validationError !== void 0) return;
				onSave({
					...settings,
					toolGuidance: {
						...draft,
						custom: draft.custom.map((entry) => ({
							...entry,
							id: entry.id.trim(),
							text: entry.text.trim()
						}))
					}
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					borderTop: "1px solid var(--dsw-alias-border-l2, #34343a)",
					marginTop: "28px",
					paddingTop: "24px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						style: {
							fontSize: "15px",
							margin: 0
						},
						children: "Agent 工具与生图策略"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							fontSize: "12px",
							lineHeight: 1.65,
							margin: "7px 0 16px",
							opacity: .58
						},
						children: "固定注入在角色卡或导入预设之后。保存后从下一次模型请求开始生效，当前会话无需重启。"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							background: "var(--dsw-alias-bg-layer-1, #202024)",
							border: "1px solid var(--dsw-alias-border-l2, #3d3d43)",
							borderRadius: "11px",
							display: "grid",
							gap: "13px",
							padding: "14px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: checkboxStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: draft.enabled,
									disabled: !writable,
									onChange: (event) => {
										setDraft((current) => ({
											...current,
											enabled: event.target.checked
										}));
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: {
										display: "block",
										fontWeight: 600
									},
									children: "启用固定工具指导"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										display: "block",
										fontSize: "11px",
										marginTop: "2px",
										opacity: .58
									},
									children: "关闭后不注入本区域，并禁止 Agent RP 的图片发布工具；DSH 其他工具仍按其原配置存在。"
								})] })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: checkboxStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: draft.includeFramework,
									disabled: !writable,
									onChange: (event) => {
										setDraft((current) => ({
											...current,
											includeFramework: event.target.checked
										}));
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: {
										display: "block",
										fontWeight: 600
									},
									children: "注入框架工具说明"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										display: "block",
										fontSize: "11px",
										marginTop: "2px",
										opacity: .58
									},
									children: "指导 Agent 使用记忆、角色导入等框架能力；这里只控制提示词，不注销这些工具。"
								})] })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: checkboxStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: draft.includeAgentRp,
									disabled: !writable,
									onChange: (event) => {
										setDraft((current) => ({
											...current,
											includeAgentRp: event.target.checked
										}));
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: {
										display: "block",
										fontWeight: 600
									},
									children: "启用 Agent RP 图片发布"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										display: "block",
										fontSize: "11px",
										marginTop: "2px",
										opacity: .58
									},
									children: "注入 publish_roleplay_image 的使用说明，并允许它把本地图片插到本轮角色回复中。"
								})] })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									display: "grid",
									fontSize: "12px",
									gap: "6px"
								},
								children: ["自动生图策略", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: draft.imageMode,
									disabled: !writable,
									onChange: (event) => {
										setDraft((current) => ({
											...current,
											imageMode: event.target.value
										}));
									},
									style: settingsFieldStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "never",
											children: "禁止生图"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "auto",
											children: "Agent 自行判断"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "always",
											children: "每个普通 RP 回合尝试生图"
										})
									]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							alignItems: "center",
							display: "flex",
							gap: "10px",
							justifyContent: "space-between",
							margin: "19px 0 9px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
							style: {
								fontSize: "13px",
								margin: 0
							},
							children: "自定义工具提示词"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								fontSize: "11px",
								lineHeight: 1.55,
								margin: "4px 0 0",
								opacity: .55
							},
							children: "用于告诉 Agent 应调用哪个已配置的 MCP 工具以及如何衔接图片发布。"
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: !writable || draft.custom.length >= 32,
							onClick: () => {
								setDraft((current) => ({
									...current,
									custom: [...current.custom, {
										id: nextToolGuidanceId(current.custom),
										enabled: true,
										text: ""
									}]
								}));
							},
							style: secondaryButtonStyle,
							children: "添加条目"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: "10px"
						},
						children: [draft.custom.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								border: "1px dashed var(--dsw-alias-border-l2, #3d3d43)",
								borderRadius: "10px",
								fontSize: "12px",
								margin: 0,
								opacity: .55,
								padding: "16px",
								textAlign: "center"
							},
							children: "没有自定义工具提示词"
						}), draft.custom.map((entry, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								border: "1px solid var(--dsw-alias-border-l2, #3d3d43)",
								borderRadius: "10px",
								padding: "12px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									alignItems: "end",
									display: "grid",
									gap: "9px",
									gridTemplateColumns: "auto minmax(0, 1fr) auto"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										style: {
											...checkboxStyle,
											alignItems: "center",
											paddingBottom: "8px"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: entry.enabled,
											disabled: !writable,
											"aria-label": `启用自定义提示词 ${index + 1}`,
											onChange: (event) => {
												setDraft((current) => ({
													...current,
													custom: current.custom.map((item, itemIndex) => itemIndex === index ? {
														...item,
														enabled: event.target.checked
													} : item)
												}));
											}
										}), "启用"]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										style: {
											display: "grid",
											fontSize: "11px",
											gap: "5px"
										},
										children: ["条目 ID", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											value: entry.id,
											maxLength: 80,
											disabled: !writable,
											placeholder: "例如 comfy-cloud-saved-workflow",
											"aria-label": `自定义提示词 ${index + 1} ID`,
											onChange: (event) => {
												setDraft((current) => ({
													...current,
													custom: current.custom.map((item, itemIndex) => itemIndex === index ? {
														...item,
														id: event.target.value
													} : item)
												}));
											},
											style: settingsFieldStyle
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: !writable,
										"aria-label": `删除自定义提示词 ${index + 1}`,
										onClick: () => {
											setDraft((current) => ({
												...current,
												custom: current.custom.filter((_item, itemIndex) => itemIndex !== index)
											}));
										},
										style: secondaryButtonStyle,
										children: "删除"
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									display: "grid",
									fontSize: "11px",
									gap: "5px",
									marginTop: "10px"
								},
								children: ["提示词内容", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: entry.text,
									maxLength: 12e3,
									rows: 8,
									disabled: !writable,
									spellCheck: false,
									"aria-label": `自定义提示词 ${index + 1} 内容`,
									onChange: (event) => {
										setDraft((current) => ({
											...current,
											custom: current.custom.map((item, itemIndex) => itemIndex === index ? {
												...item,
												text: event.target.value
											} : item)
										}));
									},
									style: {
										...settingsFieldStyle,
										lineHeight: 1.55,
										resize: "vertical"
									}
								})]
							})]
						}, index))]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							fontSize: "11px",
							lineHeight: 1.6,
							margin: "10px 0 0",
							opacity: .55
						},
						children: "默认已预制 Comfy Cloud 的 image_z_image_turbo 流程；参数必须以工具当时暴露的 schema 为准。"
					}),
					validationError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "alert",
						style: {
							color: "var(--dsw-alias-state-danger, #d64d5f)",
							fontSize: "12px",
							margin: "10px 0 0"
						},
						children: validationError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexWrap: "wrap",
							gap: "8px",
							justifyContent: "flex-end",
							marginTop: "14px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !writable,
								onClick: () => {
									setDraft(copyToolGuidance(DEFAULT_AGENT_RP_SETTINGS.toolGuidance));
								},
								style: secondaryButtonStyle,
								children: "恢复默认模板"
							}),
							dirty && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !writable,
								onClick: () => {
									setDraft(copyToolGuidance(settings.toolGuidance));
								},
								style: secondaryButtonStyle,
								children: "撤销未保存修改"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !writable || !dirty || validationError !== void 0,
								onClick: save,
								style: primaryButtonStyle,
								children: "保存工具设置"
							})
						]
					})
				]
			});
		}
		function nextImageProfileName(profiles, provider) {
			const base = provider === "openai" ? "OpenAI 配置" : provider === "novelai" ? "NovelAI 配置" : provider === "a1111" ? "A1111 配置" : "ComfyUI 配置";
			const names = new Set(profiles.map((profile) => profile.name.toLowerCase()));
			if (!names.has(base.toLowerCase())) return base;
			let suffix = 2;
			while (names.has(`${base} ${suffix}`.toLowerCase())) suffix += 1;
			return `${base} ${suffix}`;
		}
		function ImageGenerationSettingsPanel({ settings, writable, onSave }) {
			const activeProfile = settings.imageProfiles.find((profile) => profile.id === settings.activeImageProfileId) ?? settings.imageProfiles[0];
			const [draft, setDraft] = (0, react.useState)(settings.imageGeneration);
			const [profileName, setProfileName] = (0, react.useState)(activeProfile.name);
			const [credential, setCredential] = (0, react.useState)();
			const [credentialValue, setCredentialValue] = (0, react.useState)("");
			const [credentialBusy, setCredentialBusy] = (0, react.useState)(false);
			const [testBusy, setTestBusy] = (0, react.useState)(false);
			const [deleteArmed, setDeleteArmed] = (0, react.useState)(false);
			const [testResult, setTestResult] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			(0, react.useEffect)(() => {
				setDraft(settings.imageGeneration);
				setProfileName(activeProfile.name);
				setTestResult(void 0);
				setError(void 0);
				setDeleteArmed(false);
			}, [
				settings.imageGeneration,
				activeProfile.id,
				activeProfile.name
			]);
			(0, react.useEffect)(() => {
				let active = true;
				setCredential(void 0);
				setCredentialValue("");
				imageCredentialInfo(draft.provider).then((value) => {
					if (active) setCredential(value);
				}, (reason) => {
					if (active) setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					active = false;
				};
			}, [draft.provider]);
			const saveCredential = (change) => {
				setCredentialBusy(true);
				setError(void 0);
				updateImageCredential(draft.provider, change).then((value) => {
					setCredential(value);
					setCredentialValue("");
					setTestResult(void 0);
				}, (reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					setCredentialBusy(false);
				});
			};
			const testConnection = () => {
				setTestBusy(true);
				setError(void 0);
				setTestResult(void 0);
				testConfiguredImageProvider(draft).then(setTestResult, (reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					setTestBusy(false);
				});
			};
			const editDraft = (update) => {
				setDraft(update);
				setTestResult(void 0);
				setError(void 0);
				setDeleteArmed(false);
			};
			const dirty = profileName.trim() !== activeProfile.name || JSON.stringify(draft) !== JSON.stringify(settings.imageGeneration);
			const selectProfile = (id) => {
				if (dirty) {
					setError("请先保存或还原当前档案，再切换配置");
					return;
				}
				const selected = settings.imageProfiles.find((profile) => profile.id === id);
				if (selected === void 0) return;
				onSave({
					...settings,
					activeImageProfileId: selected.id,
					imageGeneration: selected.settings
				});
			};
			const createProfile = () => {
				const profile = {
					id: crypto.randomUUID(),
					name: nextImageProfileName(settings.imageProfiles, draft.provider),
					settings: draft
				};
				onSave({
					...settings,
					activeImageProfileId: profile.id,
					imageGeneration: profile.settings,
					imageProfiles: [...settings.imageProfiles, profile]
				});
			};
			const saveProfile = () => {
				const name = profileName.trim();
				if (name === "") {
					setError("配置名称不能为空");
					return;
				}
				if (settings.imageProfiles.some((profile) => profile.id !== activeProfile.id && profile.name.toLowerCase() === name.toLowerCase())) {
					setError("已有同名的图片配置");
					return;
				}
				onSave({
					...settings,
					imageGeneration: draft,
					imageProfiles: settings.imageProfiles.map((profile) => profile.id === activeProfile.id ? {
						...profile,
						name,
						settings: draft
					} : profile)
				});
			};
			const deleteProfile = () => {
				if (settings.imageProfiles.length <= 1) return;
				if (!deleteArmed) {
					setDeleteArmed(true);
					return;
				}
				const remaining = settings.imageProfiles.filter((profile) => profile.id !== activeProfile.id);
				const selected = remaining[0];
				onSave({
					...settings,
					activeImageProfileId: selected.id,
					imageGeneration: selected.settings,
					imageProfiles: remaining
				});
			};
			const restoreProfile = () => {
				setDraft(settings.imageGeneration);
				setProfileName(activeProfile.name);
				setTestResult(void 0);
				setError(void 0);
				setDeleteArmed(false);
			};
			const labelStyle = {
				display: "grid",
				fontSize: "12px",
				gap: "6px",
				opacity: writable ? 1 : .62
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					borderTop: "1px solid var(--dsw-alias-border-l2, #34343a)",
					marginTop: "28px",
					paddingTop: "24px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						style: {
							fontSize: "15px",
							margin: 0
						},
						children: "聊天插图"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							fontSize: "12px",
							lineHeight: 1.6,
							margin: "7px 0 16px",
							opacity: .58
						},
						children: "只在你点“绘图”后调用；图片保存在本机，不会作为图片输入送进角色模型"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							alignItems: "end",
							display: "flex",
							flexWrap: "wrap",
							gap: "9px",
							marginBottom: "15px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									flex: "1 1 190px"
								},
								children: ["配置档案", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									"aria-label": "配置档案",
									value: activeProfile.id,
									disabled: !writable,
									onChange: (event) => {
										selectProfile(event.target.value);
									},
									style: settingsFieldStyle,
									children: settings.imageProfiles.map((profile) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: profile.id,
										children: profile.name
									}, profile.id))
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									flex: "1 1 190px"
								},
								children: ["配置名称", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									"aria-label": "配置名称",
									value: profileName,
									disabled: !writable,
									maxLength: 80,
									onChange: (event) => {
										setProfileName(event.target.value);
										setError(void 0);
										setDeleteArmed(false);
									},
									style: settingsFieldStyle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: "7px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: !writable,
									onClick: createProfile,
									style: secondaryButtonStyle,
									children: "新建副本"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: !writable || settings.imageProfiles.length <= 1,
									onClick: deleteProfile,
									style: secondaryButtonStyle,
									children: deleteArmed ? "确认删除" : "删除"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: labelStyle,
						children: ["图片服务", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							value: draft.provider,
							disabled: !writable || credentialBusy,
							onChange: (event) => {
								editDraft((current) => ({
									...current,
									provider: event.target.value
								}));
							},
							style: settingsFieldStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "openai",
									children: "OpenAI Images / 兼容接口"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "novelai",
									children: "NovelAI V4.5"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "a1111",
									children: "A1111 / Forge"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "comfyui",
									children: "ComfyUI"
								})
							]
						})]
					}),
					draft.provider === "openai" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: "11px",
							gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
							marginTop: "12px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: ["接口地址", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.openai.endpoint,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											openai: {
												...current.openai,
												endpoint: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: ["模型", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.openai.model,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											openai: {
												...current.openai,
												model: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["尺寸", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: draft.openai.size,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											openai: {
												...current.openai,
												size: event.target.value
											}
										}));
									},
									style: settingsFieldStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "1024x1024",
											children: "1024 × 1024"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "1024x1536",
											children: "1024 × 1536（竖图）"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "1536x1024",
											children: "1536 × 1024（横图）"
										})
									]
								})]
							})
						]
					}) : draft.provider === "novelai" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: "11px",
							gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
							marginTop: "12px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["NovelAI 图片接口", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.novelai.endpoint,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											novelai: {
												...current.novelai,
												endpoint: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["V4.5 模型", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: draft.novelai.model,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											novelai: {
												...current.novelai,
												model: event.target.value
											}
										}));
									},
									style: settingsFieldStyle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "nai-diffusion-4-5-full",
										children: "V4.5 Full"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "nai-diffusion-4-5-curated",
										children: "V4.5 Curated"
									})]
								})]
							}),
							[
								["宽度", "width"],
								["高度", "height"],
								["步数", "steps"],
								["引导强度", "scale"],
								["CFG Rescale", "cfgRescale"]
							].map(([label, field]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: [label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "number",
									value: draft.novelai[field],
									disabled: !writable,
									step: field === "scale" || field === "cfgRescale" ? .01 : 1,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											novelai: {
												...current.novelai,
												[field]: Number(event.target.value)
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}, field)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: ["采样器", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: draft.novelai.sampler,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											novelai: {
												...current.novelai,
												sampler: event.target.value
											}
										}));
									},
									style: settingsFieldStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "k_euler",
											children: "Euler"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "k_euler_ancestral",
											children: "Euler Ancestral"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "k_dpmpp_2m",
											children: "DPM++ 2M"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "k_dpmpp_sde",
											children: "DPM++ SDE"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: ["噪声调度", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: draft.novelai.noiseSchedule,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											novelai: {
												...current.novelai,
												noiseSchedule: event.target.value
											}
										}));
									},
									style: settingsFieldStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "karras",
											children: "Karras"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "native",
											children: "Native"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "exponential",
											children: "Exponential"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "polyexponential",
											children: "Polyexponential"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["默认负面提示词", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: draft.novelai.negativePrompt,
									disabled: !writable,
									rows: 3,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											novelai: {
												...current.novelai,
												negativePrompt: event.target.value
											}
										}));
									},
									style: {
										...settingsFieldStyle,
										resize: "vertical"
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									display: "flex",
									flexWrap: "wrap",
									gap: "12px 18px",
									gridColumn: "1 / -1"
								},
								children: [
									["质量增强", "quality"],
									["SMEA", "smea"],
									["SMEA DYN", "smeaDyn"]
								].map(([label, field]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										alignItems: "center",
										display: "flex",
										fontSize: "12px",
										gap: "7px"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: draft.novelai[field],
										disabled: !writable || field === "smeaDyn" && !draft.novelai.smea,
										onChange: (event) => {
											editDraft((current) => ({
												...current,
												novelai: {
													...current.novelai,
													[field]: event.target.checked
												}
											}));
										}
									}), label]
								}, field))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "11px",
									gridColumn: "1 / -1",
									lineHeight: 1.6,
									margin: "-2px 0 0",
									opacity: .58
								},
								children: "当前接入 V4.5 文生图；每次绘图会按 NovelAI 规则消耗 Anlas，暂不包含 Vibe Transfer、角色参考与局部重绘。"
							})
						]
					}) : draft.provider === "a1111" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: "11px",
							gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
							marginTop: "12px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["接口地址", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.a1111.endpoint,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											a1111: {
												...current.a1111,
												endpoint: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["模型（留空使用 WebUI 当前模型）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.a1111.model,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											a1111: {
												...current.a1111,
												model: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							[
								["宽度", "width"],
								["高度", "height"],
								["步数", "steps"],
								["CFG", "cfgScale"]
							].map(([label, field]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: [label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "number",
									value: draft.a1111[field],
									disabled: !writable,
									onChange: (event) => {
										const value = Number(event.target.value);
										editDraft((current) => ({
											...current,
											a1111: {
												...current.a1111,
												[field]: value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}, field)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["采样器", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.a1111.sampler,
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											a1111: {
												...current.a1111,
												sampler: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["默认负面提示词", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: draft.a1111.negativePrompt,
									disabled: !writable,
									rows: 3,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											a1111: {
												...current.a1111,
												negativePrompt: event.target.value
											}
										}));
									},
									style: {
										...settingsFieldStyle,
										resize: "vertical"
									}
								})]
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: "11px",
							gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
							marginTop: "12px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["ComfyUI 服务地址", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: draft.comfyui.endpoint,
									disabled: !writable,
									placeholder: "http://127.0.0.1:8188",
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											comfyui: {
												...current.comfyui,
												endpoint: event.target.value
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}),
							[["宽度", "width"], ["高度", "height"]].map(([label, field]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: labelStyle,
								children: [label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "number",
									value: draft.comfyui[field],
									disabled: !writable,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											comfyui: {
												...current.comfyui,
												[field]: Number(event.target.value)
											}
										}));
									},
									style: settingsFieldStyle
								})]
							}, field)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["默认负面提示词", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: draft.comfyui.negativePrompt,
									disabled: !writable,
									rows: 3,
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											comfyui: {
												...current.comfyui,
												negativePrompt: event.target.value
											}
										}));
									},
									style: {
										...settingsFieldStyle,
										resize: "vertical"
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...labelStyle,
									gridColumn: "1 / -1"
								},
								children: ["API 格式工作流", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: draft.comfyui.workflow,
									disabled: !writable,
									rows: 12,
									spellCheck: false,
									placeholder: "在 ComfyUI 中打开“开发者模式”，导出 API 格式工作流，再把正向提示词改成 {{prompt}}",
									onChange: (event) => {
										editDraft((current) => ({
											...current,
											comfyui: {
												...current.comfyui,
												workflow: event.target.value
											}
										}));
									},
									style: {
										...settingsFieldStyle,
										fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
										resize: "vertical"
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								style: {
									fontSize: "11px",
									gridColumn: "1 / -1",
									lineHeight: 1.6,
									margin: "-3px 0 0",
									opacity: .58
								},
								children: [
									"必填：",
									"{{prompt}}",
									"。可选：",
									"{{negative_prompt}}",
									"、",
									"{{width}}",
									"、",
									"{{height}}",
									"、",
									"{{seed}}",
									"。 插件会保留节点和连线，只替换这些占位符。"
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							alignItems: "end",
							display: "grid",
							gap: "9px",
							gridTemplateColumns: "minmax(0, 1fr) auto",
							marginTop: "15px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: labelStyle,
							children: [
								draft.provider === "novelai" ? "NovelAI Access Token" : "服务密钥",
								"（按图片服务独立保存）",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "password",
									autoComplete: "new-password",
									value: credentialValue,
									placeholder: credential?.configured === true ? `已配置${credential.source === void 0 ? "" : ` · ${credential.source}`}` : draft.provider === "openai" ? "OpenAI / 兼容接口密钥" : draft.provider === "novelai" ? "NovelAI Access Token（必填）" : "无鉴权可留空",
									disabled: credentialBusy || credential?.writable === false,
									onChange: (event) => {
										setCredentialValue(event.target.value);
									},
									style: settingsFieldStyle
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "7px"
							},
							children: [credential?.configured === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: credentialBusy || !credential.writable,
								onClick: () => {
									saveCredential({ clear: true });
								},
								style: secondaryButtonStyle,
								children: "移除密钥"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: credentialBusy || credentialValue.trim() === "" || credential?.writable === false,
								onClick: () => {
									saveCredential({ value: credentialValue });
								},
								style: secondaryButtonStyle,
								children: credentialBusy ? "正在保存…" : credential?.configured === true ? "更换密钥" : "保存密钥"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: "8px",
							justifyContent: "flex-end",
							marginTop: "14px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !writable || testBusy || (draft.provider === "openai" || draft.provider === "novelai") && credential?.configured !== true,
								onClick: testConnection,
								style: secondaryButtonStyle,
								children: testBusy ? "正在测试…" : "测试连接"
							}),
							dirty && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !writable,
								onClick: restoreProfile,
								style: secondaryButtonStyle,
								children: "还原"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !writable || !dirty,
								onClick: saveProfile,
								style: primaryButtonStyle,
								children: "保存当前档案"
							})
						]
					}),
					testResult !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						style: {
							color: testResult.status === "verified" ? "var(--dsw-alias-state-success, #5dbb84)" : "var(--dsw-alias-state-warning, #d6a955)",
							fontSize: "12px",
							margin: "10px 0 0"
						},
						children: testResult.detail
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "alert",
						style: {
							color: "var(--dsw-alias-state-danger, #d64d5f)",
							fontSize: "12px",
							margin: "10px 0 0"
						},
						children: error
					})
				]
			});
		}
		function WorkspaceSettingsSection({ workspaceSettings, workspaceList }) {
			const snapshot = (0, react.useSyncExternalStore)(workspaceSettings.subscribe, workspaceSettings.getSnapshot, workspaceSettings.getSnapshot);
			const workspaceSnapshot = (0, react.useSyncExternalStore)(workspaceList.subscribe, workspaceList.getSnapshot, workspaceList.getSnapshot);
			const settings = snapshot.value;
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const writable = snapshot.status === "ready" && !saving;
			const write = (next) => {
				setSaving(true);
				setError(void 0);
				workspaceSettings.set(next).catch((reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					setSaving(false);
				});
			};
			const toggleWorkspace = (workspaceId) => {
				const selected = settings.workspaceIds.includes(workspaceId);
				write({
					...settings,
					workspaceIds: selected ? settings.workspaceIds.filter((id) => id !== workspaceId) : [...settings.workspaceIds, workspaceId]
				});
			};
			const choiceStyle = (active) => ({
				alignItems: "center",
				background: active ? `color-mix(in srgb, ${color} 13%, transparent)` : "transparent",
				border: `1px solid ${active ? `color-mix(in srgb, ${color} 45%, transparent)` : "var(--dsw-alias-border-l2, #3d3d43)"}`,
				borderRadius: "10px",
				color: "inherit",
				cursor: writable ? "pointer" : "default",
				display: "flex",
				font: "inherit",
				gap: "10px",
				padding: "11px 13px",
				textAlign: "left",
				width: "100%"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					margin: "0 auto",
					maxWidth: "720px",
					padding: "8px 4px 32px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						style: {
							fontSize: "18px",
							margin: "0 0 8px"
						},
						children: "Agent RP"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							fontSize: "13px",
							lineHeight: 1.6,
							margin: "0 0 22px",
							opacity: .62
						},
						children: "控制哪些工作区显示“选择角色”和“迁移聊天”快捷入口，已有角色会话不受影响"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: "8px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: !writable,
							style: choiceStyle(settings.workspaceMode === "all"),
							onClick: () => {
								write({
									...settings,
									workspaceMode: "all"
								});
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: { color: settings.workspaceMode === "all" ? color : "inherit" },
								children: settings.workspaceMode === "all" ? "●" : "○"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									display: "block",
									fontSize: "13px"
								},
								children: "全部工作区"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: "12px",
									opacity: .55
								},
								children: "每个工作区都显示“选择角色”和“迁移聊天”"
							})] })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: !writable,
							style: choiceStyle(settings.workspaceMode === "selected"),
							onClick: () => {
								write({
									...settings,
									workspaceMode: "selected"
								});
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: { color: settings.workspaceMode === "selected" ? color : "inherit" },
								children: settings.workspaceMode === "selected" ? "●" : "○"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									display: "block",
									fontSize: "13px"
								},
								children: "仅指定工作区"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: "12px",
									opacity: .55
								},
								children: "只在下面勾选的工作区显示入口"
							})] })]
						})]
					}),
					settings.workspaceMode === "selected" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { marginTop: "22px" },
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								style: {
									fontSize: "13px",
									margin: "0 0 9px"
								},
								children: "工作区"
							}),
							workspaceSnapshot.items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "12px",
									margin: 0,
									opacity: .55
								},
								children: "还没有可选的工作区"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									border: "1px solid var(--dsw-alias-border-l2, #3d3d43)",
									borderRadius: "11px",
									overflow: "hidden"
								},
								children: workspaceSnapshot.items.map((workspace, index) => {
									const checked = settings.workspaceIds.includes(workspace.workspaceId);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										style: {
											alignItems: "center",
											borderTop: index === 0 ? "none" : "1px solid var(--dsw-alias-border-l2, #3d3d43)",
											cursor: writable ? "pointer" : "default",
											display: "flex",
											gap: "11px",
											padding: "11px 13px"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked,
											disabled: !writable,
											onChange: () => {
												toggleWorkspace(workspace.workspaceId);
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: { minWidth: 0 },
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
												style: {
													display: "block",
													fontSize: "13px",
													fontWeight: 580
												},
												children: workspace.title
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													display: "block",
													fontSize: "11px",
													marginTop: "2px",
													opacity: .45,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap"
												},
												children: workspace.path
											})]
										})]
									}, workspace.workspaceId);
								})
							}),
							settings.workspaceIds.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "12px",
									margin: "10px 0 0",
									opacity: .58
								},
								children: "尚未选择工作区，新的角色入口会暂时隐藏"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolGuidanceSettingsPanel, {
						settings,
						writable,
						onSave: write
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageGenerationSettingsPanel, {
						settings,
						writable,
						onSave: write
					}),
					snapshot.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						style: {
							fontSize: "12px",
							marginTop: "14px",
							opacity: .55
						},
						children: "正在读取设置…"
					}),
					snapshot.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "alert",
						style: {
							color: "var(--dsw-alias-state-danger, #d64d5f)",
							fontSize: "12px",
							marginTop: "14px"
						},
						children: snapshot.error
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "alert",
						style: {
							color: "var(--dsw-alias-state-danger, #d64d5f)",
							fontSize: "12px",
							marginTop: "14px"
						},
						children: error
					})
				]
			});
		}
		const RP_DISTRIBUTION_TARGET_KEY = "dsh-agent-rp.distribution-target";
		function initialRpDistributionTarget() {
			try {
				return window.localStorage.getItem(RP_DISTRIBUTION_TARGET_KEY) ?? "http://127.0.0.1:3092";
			} catch {
				return "http://127.0.0.1:3092";
			}
		}
		function validRpDistributionRemoteAssets(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
			const assets = value;
			return [
				"characters",
				"presets",
				"personas",
				"worldInfos"
			].every((key) => {
				const entries = assets[key];
				return Array.isArray(entries) && entries.every((entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry) && typeof entry.id === "string" && typeof entry.name === "string");
			});
		}
		function RpDistributionBridgeSection({ listCharacters, listPresets, listPersonas, listWorldInfos, probe, transfer, receive }) {
			const [target, setTarget] = (0, react.useState)(initialRpDistributionTarget);
			const [connected, setConnected] = (0, react.useState)();
			const [characters, setCharacters] = (0, react.useState)([]);
			const [presets, setPresets] = (0, react.useState)([]);
			const [personas, setPersonas] = (0, react.useState)([]);
			const [worldInfos, setWorldInfos] = (0, react.useState)([]);
			const [busy, setBusy] = (0, react.useState)();
			const [notice, setNotice] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const connect = () => {
				setBusy("probe");
				setError(void 0);
				setNotice(void 0);
				Promise.all([
					probe(target),
					Promise.all([listCharacters("active"), listCharacters("archived")]).then(([active, archived]) => [...active, ...archived]),
					listPresets(),
					listPersonas(),
					listWorldInfos()
				]).then(([result, nextCharacters, nextPresets, nextPersonas, nextWorldInfos]) => {
					setConnected(result);
					setCharacters(nextCharacters);
					setPresets(nextPresets);
					setPersonas(nextPersonas);
					setWorldInfos(nextWorldInfos);
					setTarget(result.target);
					try {
						window.localStorage.setItem(RP_DISTRIBUTION_TARGET_KEY, result.target);
					} catch {}
					setNotice(`已连接：${result.experienceCount} 个体验，${result.capabilityCount} 项能力`);
				}).catch((reason) => {
					setConnected(void 0);
					setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					setBusy(void 0);
				});
			};
			const copy = (kind, id, label) => {
				if (connected === void 0) return;
				const key = `${kind}:${id}`;
				setBusy(key);
				setError(void 0);
				setNotice(void 0);
				transfer(connected.target, kind, id).then((result) => {
					setNotice(result.compatibilityDifferenceCount === 0 ? `已复制「${label}」，对方未报告兼容差异` : `已复制「${label}」，对方记录了 ${result.compatibilityDifferenceCount} 项兼容差异`);
				}).catch((reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					setBusy(void 0);
				});
			};
			const copyBack = (kind, id, label) => {
				if (connected === void 0) return;
				const key = `back:${kind}:${id}`;
				setBusy(key);
				setError(void 0);
				setNotice(void 0);
				receive(connected.target, kind, id).then(async (result) => {
					const [nextCharacters, nextPresets, nextPersonas, nextWorldInfos] = await Promise.all([
						Promise.all([listCharacters("active"), listCharacters("archived")]).then(([active, archived]) => [...active, ...archived]),
						listPresets(),
						listPersonas(),
						listWorldInfos()
					]);
					setCharacters(nextCharacters);
					setPresets(nextPresets);
					setPersonas(nextPersonas);
					setWorldInfos(nextWorldInfos);
					setNotice(`已把「${result.name || label}」复制到 Agent RP`);
				}).catch((reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					setBusy(void 0);
				});
			};
			const group = (title, kind, entries, direction) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: { marginTop: "20px" },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", {
					style: {
						fontSize: "13px",
						margin: "0 0 8px"
					},
					children: [title, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontWeight: 400,
							marginLeft: "6px",
							opacity: .45
						},
						children: entries.length
					})]
				}), entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						fontSize: "12px",
						margin: 0,
						opacity: .5
					},
					children: direction === "out" ? "Agent RP 中还没有可复制的内容" : "模块化 RP 中还没有可复制的内容"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						border: "1px solid var(--dsw-alias-border-l2, #3d3d43)",
						borderRadius: "10px",
						overflow: "hidden"
					},
					children: entries.map((entry, index) => {
						const key = direction === "out" ? `${kind}:${entry.id}` : `back:${kind}:${entry.id}`;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								alignItems: "center",
								borderTop: index === 0 ? "none" : "1px solid var(--dsw-alias-border-l2, #3d3d43)",
								display: "flex",
								gap: "12px",
								padding: "9px 11px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									flex: "1 1 auto",
									fontSize: "13px",
									minWidth: 0,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: entry.name
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy !== void 0,
								onClick: () => {
									if (direction === "out") copy(kind, entry.id, entry.name);
									else copyBack(kind, entry.id, entry.name);
								},
								style: {
									background: `color-mix(in srgb, ${color} 11%, transparent)`,
									border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
									borderRadius: "7px",
									color: "inherit",
									cursor: busy === void 0 ? "pointer" : "default",
									font: "inherit",
									fontSize: "12px",
									padding: "5px 9px"
								},
								children: busy === key ? "正在复制…" : direction === "out" ? "复制过去" : "复制回来"
							})]
						}, key);
					})
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					margin: "0 auto",
					maxWidth: "720px",
					padding: "8px 4px 32px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						style: {
							fontSize: "18px",
							margin: "0 0 8px"
						},
						children: "RP 互通"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							fontSize: "13px",
							lineHeight: 1.65,
							margin: "0 0 18px",
							opacity: .62
						},
						children: "在 Agent RP 与本机模块化 RP 之间复制角色卡、预设、Persona 和世界书。复制不会修改来源库或现有会话"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							alignItems: "end",
							display: "grid",
							gap: "8px",
							gridTemplateColumns: "minmax(0, 1fr) auto"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: {
								display: "grid",
								fontSize: "12px",
								gap: "6px"
							},
							children: ["模块化 RP 地址", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								value: target,
								onChange: (event) => {
									setTarget(event.target.value);
									setConnected(void 0);
								},
								placeholder: "http://127.0.0.1:3092",
								style: settingsFieldStyle
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy !== void 0 || target.trim() === "",
							onClick: connect,
							style: {
								background: `color-mix(in srgb, ${color} 13%, transparent)`,
								border: `1px solid color-mix(in srgb, ${color} 34%, transparent)`,
								borderRadius: "8px",
								color: "inherit",
								cursor: busy === void 0 ? "pointer" : "default",
								font: "inherit",
								fontSize: "12px",
								padding: "8px 12px"
							},
							children: busy === "probe" ? "正在连接…" : connected === void 0 ? "连接" : "刷新"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							fontSize: "11px",
							lineHeight: 1.55,
							margin: "8px 0 0",
							opacity: .48
						},
						children: "为避免意外发送角色资料，只接受 localhost、127.0.0.1 或 ::1 地址"
					}),
					notice !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						style: {
							color: "var(--dsw-alias-state-success, #4fba83)",
							fontSize: "12px",
							margin: "13px 0 0"
						},
						children: notice
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "alert",
						style: {
							color: "var(--dsw-alias-state-danger, #d64d5f)",
							fontSize: "12px",
							margin: "13px 0 0"
						},
						children: error
					}),
					connected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							style: {
								fontSize: "14px",
								margin: "24px 0 0"
							},
							children: "Agent RP → 模块化 RP"
						}),
						group("角色卡", "character", characters.map((entry) => ({
							id: entry.id,
							name: entry.displayName
						})), "out"),
						group("预设", "preset", presets, "out"),
						group("Persona", "persona", personas, "out"),
						group("世界书", "world-info", worldInfos, "out"),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							style: {
								fontSize: "14px",
								margin: "28px 0 0"
							},
							children: "模块化 RP → Agent RP"
						}),
						group("角色卡", "character", connected.remoteAssets.characters, "back"),
						group("预设", "preset", connected.remoteAssets.presets, "back"),
						group("Persona", "persona", connected.remoteAssets.personas, "back"),
						group("世界书", "world-info", connected.remoteAssets.worldInfos, "back")
					] })
				]
			});
		}
		function RoleplayHeader({ sessionId, useProjection, useSessions, loadAvatar, renameSession, configurePreset, importPresetFile, importPreset, managePresetLibrary, configureWorldInfo, importWorldInfo, listCharacters, readCharacter, setCharacterArchived, importCharacterFile, migrateChat, migrateRpDistributionChat, startCharacterSession, exportChat, listMemory, manageMemory, listPresets, listPersonas, savePersona, deletePersona, applyPersona, loadModelCapabilities }) {
			const summary = useSessions((state) => state.byId[sessionId]);
			const projection = roleplaySummary(summary, useProjection("agentRp"));
			const [open, setOpen] = (0, react.useState)(false);
			const [statusOpen, setStatusOpen] = (0, react.useState)(false);
			const [presetOpen, setPresetOpen] = (0, react.useState)(false);
			const [worldInfoOpen, setWorldInfoOpen] = (0, react.useState)(false);
			const [libraryOpen, setLibraryOpen] = (0, react.useState)(false);
			const [migrationOpen, setMigrationOpen] = (0, react.useState)(false);
			const [personaOpen, setPersonaOpen] = (0, react.useState)(false);
			const [memoryOpen, setMemoryOpen] = (0, react.useState)(false);
			const [settingsOpen, setSettingsOpen] = (0, react.useState)(false);
			const [exporting, setExporting] = (0, react.useState)(false);
			const [exportError, setExportError] = (0, react.useState)();
			const [aliasDraft, setAliasDraft] = (0, react.useState)("");
			const [aliasError, setAliasError] = (0, react.useState)();
			const [renaming, setRenaming] = (0, react.useState)(false);
			const viewMode = useRoleplayViewMode(sessionId);
			const characterDetail = useCharacterDetail(projection?.avatarLibraryId);
			const expressionChoice = useRoleplayExpression(sessionId);
			const rootRef = (0, react.useRef)(null);
			const settingsRef = (0, react.useRef)(null);
			const settingsSummaryRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!settingsOpen) return;
				const closeOutside = (event) => {
					if (event.target instanceof Node && !settingsRef.current?.contains(event.target)) setSettingsOpen(false);
				};
				const closeWithEscape = (event) => {
					if (event.key !== "Escape") return;
					event.preventDefault();
					setSettingsOpen(false);
					settingsSummaryRef.current?.focus();
				};
				document.addEventListener("pointerdown", closeOutside);
				document.addEventListener("keydown", closeWithEscape);
				return () => {
					document.removeEventListener("pointerdown", closeOutside);
					document.removeEventListener("keydown", closeWithEscape);
				};
			}, [settingsOpen]);
			(0, react.useLayoutEffect)(() => {
				if (viewMode === "debug") return;
				const root = rootRef.current;
				const header = root?.closest("header");
				if (root == null || header == null) return;
				const actionSiblings = Array.from(root.parentElement?.children ?? []).filter((element) => element !== root && element instanceof HTMLElement);
				const secondaryTabs = Array.from(header.querySelectorAll("[role=\"tablist\"] [role=\"tab\"]")).slice(1);
				return hideWhileMounted([
					header.querySelector("nav[aria-label]"),
					...actionSiblings,
					...secondaryTabs
				]);
			}, [projection !== void 0, viewMode]);
			if (projection === void 0) return null;
			const displayName = roleplayDisplayName(summary, projection);
			const displayProjection = displayName === projection.characterName ? projection : {
				...projection,
				characterName: displayName
			};
			const expression = expressionChoice === "default" ? void 0 : characterDetail?.imageAssets.find((asset) => (asset.type === "emotion" || asset.type === "expression") && asset.index === expressionChoice);
			const expressionUrl = expression === void 0 || projection.avatarLibraryId === void 0 ? void 0 : characterLibraryImageUrl(projection.avatarLibraryId, expression.index);
			const imported = projection.importedMessageCount > 0;
			const status = projection.frontend === void 0 || projection.mvu === void 0 ? void 0 : renderCharacterDisplay(statusPlaceholder, {
				name: projection.characterName,
				frontend: projection.frontend
			}, 2, 0, projection.userName, projection.preset?.regexScripts);
			const statusHtml = status === void 0 || status === statusPlaceholder ? void 0 : splitCharacterDisplay(status).find((segment) => segment.kind === "html")?.source;
			const statusSource = statusHtml === void 0 || projection.mvu === void 0 ? void 0 : compileCardFrameDocument(statusHtml, {
				origin: window.location.origin,
				textColor: getComputedStyle(document.body).color,
				statData: projection.mvu.statData,
				...characterDetail === void 0 ? {} : { character: characterDetail }
			});
			const characterRegexScripts = (projection.frontend?.regexScripts ?? []).map((script, index) => ({
				index,
				...summarizeCharacterRegexScript(script)
			}));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: rootRef,
					className: "agent-rp-header",
					"data-agent-rp-header": true,
					style: {
						alignItems: "center",
						display: "flex",
						gap: "10px",
						marginRight: "auto",
						minWidth: 0
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
							projection: displayProjection,
							loadAvatar,
							...expressionUrl === void 0 ? {} : { imageUrl: expressionUrl }
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "agent-rp-header-meta",
							style: { minWidth: 0 },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									alignItems: "baseline",
									display: "flex",
									gap: "8px",
									minWidth: 0
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: {
										fontSize: "15px",
										fontWeight: 620,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: displayName
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "agent-rp-header-kind",
									style: {
										fontSize: "11px",
										opacity: .48,
										whiteSpace: "nowrap"
									},
									children: imported ? "已迁移对话" : "角色对话"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "agent-rp-header-capabilities",
								style: {
									fontSize: "12px",
									marginTop: "2px",
									opacity: .55,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: characterCapabilitySummary(projection)
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "agent-rp-header-primary-action",
							type: "button",
							onClick: () => {
								setSettingsOpen(false);
								setOpen(true);
							},
							style: {
								background: "transparent",
								border: "1px solid var(--dsw-alias-border-l2, #444)",
								borderRadius: "8px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "12px",
								marginLeft: "8px",
								padding: "6px 10px"
							},
							children: "角色信息"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "agent-rp-header-primary-action",
							type: "button",
							onClick: () => {
								setSettingsOpen(false);
								setLibraryOpen(true);
							},
							style: {
								background: `color-mix(in srgb, ${color} 10%, transparent)`,
								border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
								borderRadius: "8px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "12px",
								padding: "6px 10px"
							},
							children: "角色库"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							className: "agent-rp-header-primary-action",
							type: "button",
							onClick: () => {
								setSettingsOpen(false);
								setPersonaOpen(true);
							},
							style: {
								background: projection.persona === void 0 ? "transparent" : `color-mix(in srgb, ${color} 12%, transparent)`,
								border: `1px solid ${projection.persona === void 0 ? "var(--dsw-alias-border-l2, #444)" : `color-mix(in srgb, ${color} 34%, transparent)`}`,
								borderRadius: "8px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "12px",
								padding: "6px 10px"
							},
							children: ["身份", projection.persona === void 0 ? "" : ` · ${projection.persona.name}`]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
							className: "agent-rp-header-settings",
							ref: settingsRef,
							open: settingsOpen,
							onToggle: (event) => {
								setSettingsOpen(event.currentTarget.open);
							},
							style: { position: "relative" },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
								ref: settingsSummaryRef,
								role: "button",
								"aria-expanded": settingsOpen,
								"aria-haspopup": "menu",
								style: {
									background: projection.worldInfo.activeCount > 0 ? `color-mix(in srgb, ${color} 10%, transparent)` : "transparent",
									border: "1px solid var(--dsw-alias-border-l2, #444)",
									borderRadius: "8px",
									color: "inherit",
									cursor: "pointer",
									fontSize: "12px",
									listStyle: "none",
									padding: "6px 10px",
									whiteSpace: "nowrap"
								},
								children: "会话设置"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								role: "menu",
								"aria-label": "角色会话设置",
								style: {
									background: "var(--dsw-alias-bg-base, #171719)",
									border: "1px solid var(--dsw-alias-border-l2, #39393c)",
									borderRadius: "10px",
									boxShadow: "0 14px 38px rgba(0,0,0,.36)",
									display: "grid",
									gap: "3px",
									minWidth: "168px",
									padding: "6px",
									position: "absolute",
									right: 0,
									top: "calc(100% + 7px)",
									zIndex: 80
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "agent-rp-mobile-only",
										type: "button",
										role: "menuitem",
										onClick: () => {
											setSettingsOpen(false);
											setOpen(true);
										},
										style: headerMenuItemStyle,
										children: "角色信息"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "agent-rp-mobile-only",
										type: "button",
										role: "menuitem",
										onClick: () => {
											setSettingsOpen(false);
											setLibraryOpen(true);
										},
										style: headerMenuItemStyle,
										children: "角色库"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "agent-rp-mobile-only",
										type: "button",
										role: "menuitem",
										onClick: () => {
											setSettingsOpen(false);
											setPersonaOpen(true);
										},
										style: headerMenuItemStyle,
										children: "你的身份"
									}),
									statusSource !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "agent-rp-mobile-only",
										type: "button",
										role: "menuitem",
										onClick: () => {
											setSettingsOpen(false);
											setStatusOpen(true);
										},
										style: headerMenuItemStyle,
										children: "当前状态"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "menuitem",
										onClick: () => {
											setSettingsOpen(false);
											setMigrationOpen(true);
										},
										style: headerMenuItemStyle,
										children: "迁移聊天"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "menuitem",
										disabled: exporting,
										onClick: () => {
											setExporting(true);
											setExportError(void 0);
											exportChat(sessionId).then(() => {
												setSettingsOpen(false);
											}, (reason) => {
												setExportError(reason instanceof Error ? reason.message : String(reason));
											}).finally(() => {
												setExporting(false);
											});
										},
										style: headerMenuItemStyle,
										children: exporting ? "正在导出…" : "导出聊天"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "menuitem",
										onClick: () => {
											setSettingsOpen(false);
											setMemoryOpen(true);
										},
										style: headerMenuItemStyle,
										children: "记忆"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "menuitem",
										onClick: () => {
											setSettingsOpen(false);
											setPresetOpen(true);
										},
										style: headerMenuItemStyle,
										children: "预设"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										role: "menuitem",
										onClick: () => {
											setSettingsOpen(false);
											setWorldInfoOpen(true);
										},
										style: headerMenuItemStyle,
										children: ["世界书", projection.worldInfo.activeCount === 0 ? "" : ` · ${projection.worldInfo.activeCount}`]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "menuitem",
										"aria-pressed": viewMode === "debug",
										onClick: () => {
											setSettingsOpen(false);
											setRoleplayViewMode(sessionId, viewMode === "immersive" ? "debug" : "immersive");
										},
										style: headerMenuItemStyle,
										children: viewMode === "debug" ? "返回沉浸视图" : "打开调试视图"
									}),
									exportError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										role: "alert",
										style: {
											color: "var(--dsw-alias-state-danger, #d64d5f)",
											fontSize: "11px",
											lineHeight: 1.45,
											margin: "4px 8px 3px",
											maxWidth: "240px"
										},
										children: exportError
									})
								]
							})]
						}),
						statusSource !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "agent-rp-header-primary-action",
							type: "button",
							onClick: () => {
								setStatusOpen(true);
							},
							style: {
								background: `color-mix(in srgb, ${color} 12%, transparent)`,
								border: `1px solid color-mix(in srgb, ${color} 34%, transparent)`,
								borderRadius: "8px",
								color: "inherit",
								cursor: "pointer",
								font: "inherit",
								fontSize: "12px",
								padding: "6px 10px"
							},
							children: "当前状态"
						})
					]
				}),
				migrationOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SillyTavernImportDialog, {
					listPresets,
					onClose: () => {
						setMigrationOpen(false);
					},
					onImport: (chatFile, cardFile, presetId) => migrateChat(sessionId, chatFile, cardFile, presetId),
					onImportRpDistribution: (target, remoteSessionId, presetId) => migrateRpDistributionChat(sessionId, target, remoteSessionId, presetId)
				}),
				personaOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PersonaManagerDialog, {
					...projection.persona === void 0 ? {} : { current: projection.persona },
					listPersonas,
					savePersona,
					deletePersona,
					onApply: (persona) => applyPersona(sessionId, persona),
					onClose: () => {
						setPersonaOpen(false);
					}
				}),
				memoryOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MemoryManagerDialog, {
					onClose: () => {
						setMemoryOpen(false);
					},
					load: () => listMemory(sessionId),
					onManage: (request) => manageMemory(sessionId, request)
				}),
				open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"data-agent-rp-dialog": true,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": `${displayName}的角色信息`,
					style: {
						alignItems: "stretch",
						background: "rgba(0,0,0,.48)",
						display: "flex",
						inset: 0,
						justifyContent: "flex-end",
						position: "fixed",
						zIndex: 1e3
					},
					onMouseDown: (event) => {
						if (event.target === event.currentTarget) setOpen(false);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
						className: "agent-rp-character-info",
						style: {
							background: "var(--dsw-alias-bg-base, #171719)",
							borderLeft: "1px solid var(--dsw-alias-border-l2, #39393c)",
							boxShadow: "-18px 0 44px rgba(0,0,0,.2)",
							maxWidth: "92vw",
							overflowY: "auto",
							padding: "24px",
							width: "380px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									alignItems: "center",
									display: "flex",
									gap: "13px"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
										projection: displayProjection,
										loadAvatar,
										...expressionUrl === void 0 ? {} : { imageUrl: expressionUrl },
										size: 54
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: { minWidth: 0 },
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
											style: {
												fontSize: "18px",
												margin: 0
											},
											children: displayName
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												fontSize: "12px",
												marginTop: "5px",
												opacity: .52
											},
											children: projection.cardVersion === void 0 ? "角色会话" : `角色卡 V${projection.cardVersion}`
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "关闭角色信息",
										onClick: () => {
											setOpen(false);
										},
										style: {
											background: "transparent",
											border: 0,
											color: "inherit",
											cursor: "pointer",
											fontSize: "22px",
											marginLeft: "auto",
											padding: "4px"
										},
										children: "×"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexWrap: "wrap",
									gap: "7px",
									marginTop: "20px"
								},
								children: [
									projection.userName !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: ["你是 ", projection.userName]
									}),
									projection.importedMessageCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: [projection.importedMessageCount, " 条历史消息"]
									}),
									projection.worldInfoCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: [projection.worldInfoCount, " 条世界书设定"]
									}),
									characterRegexScripts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: [
											"角色卡正则 · ",
											characterRegexScripts.length,
											" 条"
										]
									}),
									(projection.frontend?.tavernHelperScriptNames.length ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: [
											"酒馆脚本 · ",
											projection.frontend?.tavernHelperScriptNames.length,
											" 个启用 · 隔离运行"
										]
									}),
									projection.mvu !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: ["MVU · 已接通", projection.mvu.updateCount === 0 ? "" : ` · ${projection.mvu.updateCount} 次更新`]
									}),
									(characterDetail?.imageAssets.length ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: [
											"卡片资源 · ",
											characterDetail?.imageAssets.length,
											" 张图片"
										]
									}),
									projection.preset !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: chipStyle,
										children: [
											"预设 · ",
											projection.preset.name,
											" · ",
											projection.preset.enabledCount,
											"/",
											projection.preset.promptCount,
											" 项启用"
										]
									})
								]
							}),
							characterRegexScripts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { marginTop: "16px" },
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterRegexScriptsSection, {
									scripts: characterRegexScripts,
									promptRegex: projection.promptRegex
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
								style: { marginTop: "20px" },
								onSubmit: (event) => {
									event.preventDefault();
									const alias = aliasDraft.trim();
									if (alias === "") {
										setAliasError("显示名不能为空");
										return;
									}
									setRenaming(true);
									setAliasError(void 0);
									renameSession(sessionId, alias).then(() => {
										setRenaming(false);
									}, (error) => {
										setRenaming(false);
										setAliasError(error instanceof Error ? error.message : String(error));
									});
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										htmlFor: `agent-rp-alias-${sessionId}`,
										style: {
											display: "block",
											fontSize: "12px",
											fontWeight: 600,
											marginBottom: "7px",
											opacity: .56
										},
										children: "显示名"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: "8px"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											id: `agent-rp-alias-${sessionId}`,
											value: aliasDraft,
											placeholder: displayName,
											onChange: (event) => {
												setAliasDraft(event.target.value);
											},
											style: {
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
												borderRadius: "8px",
												color: "inherit",
												flex: 1,
												font: "inherit",
												minWidth: 0,
												padding: "7px 9px"
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "submit",
											disabled: renaming,
											style: {
												background: `color-mix(in srgb, ${color} 14%, transparent)`,
												border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
												borderRadius: "8px",
												color: "inherit",
												cursor: renaming ? "wait" : "pointer",
												font: "inherit",
												padding: "7px 10px"
											},
											children: renaming ? "保存中" : "保存"
										})]
									}),
									aliasError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										role: "alert",
										style: {
											color: "#e88989",
											fontSize: "12px",
											marginTop: "6px"
										},
										children: aliasError
									}),
									projection.originalCharacterName !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: "11px",
											lineHeight: 1.5,
											marginTop: "7px",
											opacity: .48
										},
										children: ["原始卡名：", projection.originalCharacterName]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
								title: "角色简介",
								text: projection.description
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
								title: "性格",
								text: projection.personality
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
								title: "当前场景",
								text: projection.scenario
							}),
							projection.persona !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
								title: `Persona · ${projection.persona.name}`,
								text: projection.persona.description || "没有额外人物设定"
							}),
							characterDetail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterRemoteResourcesSection, { detail: characterDetail }),
							characterDetail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterAssetsSection, {
								detail: characterDetail,
								sessionId
							}),
							projection.preset !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
								title: "运行预设",
								text: [
									`${projection.preset.promptCount} 个提示模块，当前启用 ${projection.preset.enabledCount} 个`,
									projection.preset.appliedGeneration.length === 0 ? "没有可直接映射的生成参数" : `已映射：${projection.preset.appliedGeneration.join("、")}`,
									projection.preset.preservedGeneration.length === 0 ? "" : `已保留但当前 Host 未应用：${projection.preset.preservedGeneration.join("、")}`,
									projection.preset.degradedRoleCount === 0 ? "" : `${projection.preset.degradedRoleCount} 项非 system 角色按 Host 兼容模式注入`,
									projection.preset.preservedInChatCount === 0 ? "" : `${projection.preset.preservedInChatCount} 项聊天内注入正在按深度和优先级运行`,
									projection.preset.regexScriptCount === 0 ? "" : `${projection.preset.enabledRegexScriptCount}/${projection.preset.regexScriptCount} 条正则启用`,
									projection.preset.activeDisplayRegexCount === 0 ? "" : `${projection.preset.activeDisplayRegexCount} 条显示规则正在运行`,
									projection.preset.preservedPromptRegexCount === 0 ? "" : `${projection.preset.preservedPromptRegexCount} 条生成规则正在模型消息副本中运行`,
									...projection.preset.extensionStatus.map((item) => `${item.name}：${item.detail}`)
								].filter(Boolean).join("\n")
							}),
							projection.source === "sillytavern-chat" && projection.cardVersion === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "13px",
									lineHeight: 1.7,
									marginTop: "22px",
									opacity: .62
								},
								children: "当前只迁移了聊天记录，没有对应角色卡；再次迁移时可将角色卡和 JSONL 放在同一条消息中"
							})
						]
					})
				}),
				statusOpen && statusSource !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoleplayStatusDialog, {
					characterName: displayName,
					source: statusSource,
					onClose: () => {
						setStatusOpen(false);
					}
				}),
				libraryOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterLibraryDialog, {
					currentCharacterName: projection.characterName,
					...projection.avatarLibraryId === void 0 ? {} : { currentCharacterId: projection.avatarLibraryId },
					listCharacters,
					readCharacter,
					setCharacterArchived,
					importCharacterFile,
					onClose: () => {
						setLibraryOpen(false);
					},
					onStart: (character, greetingIndex, persona, presetId, memory) => startCharacterSession(sessionId, character, greetingIndex, persona, presetId, memory),
					listPresets,
					importPresetFile,
					listPersonas,
					savePersona,
					deletePersona
				}),
				presetOpen && (projection.preset === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetImportDialog, {
					entries: projection.presetLibrary,
					onClose: () => {
						setPresetOpen(false);
					},
					onImport: (file) => importPreset(sessionId, file),
					onLibrary: (request) => managePresetLibrary(sessionId, request)
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetManagerDialog, {
					sessionId,
					preset: projection.preset,
					lastRequest: projection.lastRequest,
					promptRegex: projection.promptRegex,
					entries: projection.presetLibrary,
					loadModelCapabilities,
					onClose: () => {
						setPresetOpen(false);
					},
					onImport: (file) => importPreset(sessionId, file),
					onSave: (request) => configurePreset(sessionId, request),
					onLibrary: (request) => managePresetLibrary(sessionId, request)
				})),
				worldInfoOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorldInfoManagerDialog, {
					worldInfo: projection.worldInfo,
					onClose: () => {
						setWorldInfoOpen(false);
					},
					onImport: (file) => importWorldInfo(sessionId, file),
					onSave: (request) => configureWorldInfo(sessionId, request)
				})
			] });
		}
		const memoryKindLabels = {
			fact: "事实",
			promise: "约定",
			relationship: "关系",
			preference: "偏好",
			event: "共同经历"
		};
		function MemoryManagerDialog({ load, onManage, onClose }) {
			const [memories, setMemories] = (0, react.useState)();
			const [editing, setEditing] = (0, react.useState)();
			const [kind, setKind] = (0, react.useState)("fact");
			const [subject, setSubject] = (0, react.useState)("");
			const [text, setText] = (0, react.useState)("");
			const [forgetting, setForgetting] = (0, react.useState)();
			const [creating, setCreating] = (0, react.useState)(false);
			const [query, setQuery] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const refresh = () => load().then(setMemories);
			(0, react.useEffect)(() => {
				let current = true;
				load().then((value) => {
					if (current) setMemories(value);
				}, (reason) => {
					if (current) setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					current = false;
				};
			}, []);
			const beginCorrection = (memory) => {
				setCreating(false);
				setEditing(memory);
				setKind(memory.kind);
				setSubject(memory.subject);
				setText(memory.text);
				setForgetting(void 0);
				setError(void 0);
			};
			const beginCreation = () => {
				setCreating(true);
				setEditing(void 0);
				setKind("fact");
				setSubject("");
				setText("");
				setForgetting(void 0);
				setError(void 0);
			};
			const run = (request) => {
				setBusy(true);
				setError(void 0);
				onManage(request).then(refresh).then(() => {
					setEditing(void 0);
					setCreating(false);
					setForgetting(void 0);
				}).catch((reason) => {
					setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					setBusy(false);
				});
			};
			const normalizedQuery = query.trim().toLocaleLowerCase();
			const visibleMemories = (memories ?? []).filter((memory) => normalizedQuery === "" || `${memory.subject}\n${memory.text}\n${memoryKindLabels[memory.kind]}`.toLocaleLowerCase().includes(normalizedQuery));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-dialog": true,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "角色记忆",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.62)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1200
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget && !busy) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #171719)",
						border: "1px solid var(--dsw-alias-border-l2, #3e3e43)",
						borderRadius: "14px",
						boxShadow: "0 18px 58px rgba(0,0,0,.42)",
						maxHeight: "min(720px, 86vh)",
						maxWidth: "640px",
						overflowY: "auto",
						padding: "20px",
						width: "100%"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								alignItems: "start",
								display: "flex",
								gap: "16px",
								justifyContent: "space-between"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									alignItems: "center",
									display: "flex",
									gap: "8px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: {
										fontSize: "17px",
										margin: 0
									},
									children: "角色记忆"
								}), memories !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										fontSize: "11px",
										opacity: .45
									},
									children: [memories.length, " 条有效"]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "12px",
									lineHeight: 1.55,
									margin: "5px 0 0",
									opacity: .58
								},
								children: "这些内容会在之后的回复中继续生效。纠正和忘记都会保留在本机会话历史中"
							})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									alignItems: "center",
									display: "flex",
									gap: "8px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy,
									onClick: () => {
										if (creating) setCreating(false);
										else beginCreation();
									},
									style: {
										...headerMenuItemStyle,
										color
									},
									children: creating ? "取消新增" : "新增记忆"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy,
									onClick: onClose,
									style: {
										background: "transparent",
										border: 0,
										color: "inherit",
										cursor: busy ? "default" : "pointer",
										font: "inherit",
										fontSize: "18px",
										opacity: .6,
										padding: "0 3px"
									},
									"aria-label": "关闭记忆管理",
									children: "×"
								})]
							})]
						}),
						memories === void 0 && error === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "status",
							style: {
								fontSize: "13px",
								margin: "24px 0 4px",
								opacity: .58
							},
							children: "正在读取记忆…"
						}),
						creating && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								background: "var(--dsw-alias-bg-layer-1, #222226)",
								border: `1px solid color-mix(in srgb, ${color} 34%, transparent)`,
								borderRadius: "11px",
								display: "grid",
								gap: "9px",
								marginTop: "18px",
								padding: "13px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: { fontSize: "13px" },
									children: "新增一条有效记忆"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "grid",
										gap: "9px",
										gridTemplateColumns: "120px minmax(0, 1fr)"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
										value: kind,
										onChange: (event) => {
											setKind(event.target.value);
										},
										style: settingsFieldStyle,
										children: Object.entries(memoryKindLabels).map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value,
											children: label
										}, value))
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: subject,
										maxLength: 120,
										placeholder: "主题，例如：称呼",
										onChange: (event) => {
											setSubject(event.target.value);
										},
										"aria-label": "新增记忆主题",
										style: settingsFieldStyle
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: text,
									maxLength: 1e3,
									rows: 4,
									placeholder: "写下希望角色长期记住的内容",
									onChange: (event) => {
										setText(event.target.value);
									},
									"aria-label": "新增记忆内容",
									style: {
										...settingsFieldStyle,
										lineHeight: 1.55,
										resize: "vertical"
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy || subject.trim() === "" || text.trim() === "",
									onClick: () => {
										run({
											format: 0,
											operation: "add",
											kind,
											subject: subject.trim(),
											text: text.trim()
										});
									},
									style: {
										background: color,
										border: 0,
										borderRadius: "8px",
										color: "#fff",
										cursor: busy ? "default" : "pointer",
										font: "inherit",
										fontSize: "12px",
										justifySelf: "end",
										padding: "7px 12px",
										opacity: subject.trim() === "" || text.trim() === "" ? .45 : 1
									},
									children: busy ? "正在保存…" : "保存记忆"
								})
							]
						}),
						memories?.length === 0 && !creating && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								background: "var(--dsw-alias-bg-layer-1, #222226)",
								borderRadius: "10px",
								marginTop: "18px",
								padding: "20px",
								textAlign: "center"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									display: "block",
									fontSize: "13px"
								},
								children: "还没有持久记忆"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									display: "block",
									fontSize: "12px",
									marginTop: "6px",
									opacity: .52
								},
								children: "角色在确实值得长期保留时才会记下来"
							})]
						}),
						memories !== void 0 && memories.length > 5 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "search",
							value: query,
							"aria-label": "搜索角色记忆",
							placeholder: "搜索主题或内容",
							onChange: (event) => {
								setQuery(event.target.value);
							},
							style: {
								...settingsFieldStyle,
								boxSizing: "border-box",
								marginTop: "16px",
								width: "100%"
							}
						}),
						memories !== void 0 && memories.length > 0 && visibleMemories.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								fontSize: "12px",
								margin: "18px 0 2px",
								opacity: .55,
								textAlign: "center"
							},
							children: "没有找到匹配的记忆"
						}),
						memories !== void 0 && memories.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gap: "10px",
								marginTop: "18px"
							},
							children: visibleMemories.map((memory) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
								style: {
									background: "var(--dsw-alias-bg-layer-1, #222226)",
									border: "1px solid var(--dsw-alias-border-l2, #3e3e43)",
									borderRadius: "11px",
									padding: "13px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										alignItems: "center",
										display: "flex",
										gap: "7px"
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
											style: { fontSize: "13px" },
											children: memory.subject
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												background: `color-mix(in srgb, ${color} 13%, transparent)`,
												borderRadius: "999px",
												fontSize: "10px",
												opacity: .82,
												padding: "2px 7px"
											},
											children: memoryKindLabels[memory.kind]
										}),
										memory.source !== "character" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												fontSize: "10px",
												marginLeft: "auto",
												opacity: .45
											},
											children: memory.source === "user" ? "由你保存" : "从上一段带来"
										})
									]
								}), editing?.id === memory.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "grid",
										gap: "9px",
										marginTop: "12px"
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "grid",
												gap: "9px",
												gridTemplateColumns: "120px minmax(0, 1fr)"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
												value: kind,
												onChange: (event) => {
													setKind(event.target.value);
												},
												style: settingsFieldStyle,
												children: Object.entries(memoryKindLabels).map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value,
													children: label
												}, value))
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												value: subject,
												maxLength: 120,
												onChange: (event) => {
													setSubject(event.target.value);
												},
												"aria-label": "记忆主题",
												style: settingsFieldStyle
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											value: text,
											maxLength: 1e3,
											rows: 4,
											onChange: (event) => {
												setText(event.target.value);
											},
											"aria-label": "记忆内容",
											style: {
												...settingsFieldStyle,
												lineHeight: 1.55,
												resize: "vertical"
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: "8px",
												justifyContent: "flex-end"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												disabled: busy,
												onClick: () => {
													setEditing(void 0);
												},
												style: headerMenuItemStyle,
												children: "取消"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												disabled: busy || subject.trim() === "" || text.trim() === "",
												onClick: () => {
													run({
														format: 0,
														operation: "correct",
														id: memory.id,
														kind,
														subject: subject.trim(),
														text: text.trim()
													});
												},
												style: {
													background: color,
													border: 0,
													borderRadius: "8px",
													color: "#fff",
													cursor: busy ? "default" : "pointer",
													font: "inherit",
													fontSize: "12px",
													padding: "7px 12px"
												},
												children: busy ? "正在保存…" : "保存纠正"
											})]
										})
									]
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										fontSize: "13px",
										lineHeight: 1.65,
										margin: "8px 0 0",
										whiteSpace: "pre-wrap"
									},
									children: memory.text
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: "8px",
										justifyContent: "flex-end",
										marginTop: "10px"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: busy,
										onClick: () => {
											beginCorrection(memory);
										},
										style: headerMenuItemStyle,
										children: "纠正"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: busy,
										onClick: () => {
											if (forgetting === memory.id) run({
												format: 0,
												operation: "forget",
												id: memory.id
											});
											else {
												setForgetting(memory.id);
												setEditing(void 0);
											}
										},
										style: {
											...headerMenuItemStyle,
											color: forgetting === memory.id ? "var(--dsw-alias-state-danger, #e06470)" : "inherit"
										},
										children: forgetting === memory.id ? "确认忘记" : "忘记"
									})]
								})] })]
							}, memory.id))
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							style: {
								color: "var(--dsw-alias-state-danger, #e06470)",
								fontSize: "12px",
								lineHeight: 1.5,
								margin: "14px 0 0"
							},
							children: error
						})
					]
				})
			});
		}
		function worldInfoEntryTitle(entry) {
			return entry.name?.trim() || entry.comment?.trim() || entry.keys[0] || (entry.constant ? "常驻设定" : `条目 ${entry.sourceId}`);
		}
		function worldInfoReason(entry) {
			switch (entry.reason) {
				case "active-constant": return {
					title: "正在生效",
					detail: "这是常驻条目，会进入下一次回复的提示"
				};
				case "active-keyword": return {
					title: "正在生效",
					detail: `当前对话命中了${entry.matchedKeys.length === 0 ? "关键词" : `“${entry.matchedKeys.join("”“")}”`}`
				};
				case "disabled": return {
					title: "已关闭",
					detail: "打开条目后才会参与匹配"
				};
				case "deleted": return {
					title: "已从本会话移除",
					detail: "原始卡片仍完整保留，可以随时恢复"
				};
				case "empty-content": return {
					title: "没有内容",
					detail: "条目正文为空，不会进入提示"
				};
				case "decorator-unsupported": return {
					title: "暂不执行",
					detail: "正文含有酒馆装饰器；内容已保留，但当前运行层不会执行"
				};
				case "template-unsupported": return {
					title: "EJS 尚未就绪",
					detail: "正文含有 EJS，但当前运行实例没有载入隔离执行环境"
				};
				case "template-error": return {
					title: "EJS 本轮未生效",
					detail: entry.template === "execution-limit" ? "模板超过执行步数限制，已只跳过这一条" : entry.template === "memory-limit" ? "模板超过内存限制，已只跳过这一条" : entry.template === "output-limit" || entry.template === "source-limit" ? "模板或输出过长，已只跳过这一条" : entry.template === "syntax-error" ? "模板语法无法解析，已只跳过这一条" : "模板执行失败，已只跳过这一条"
				};
				case "regex-unsupported": return {
					title: "暂不执行",
					detail: "该条目使用正则关键词；当前只执行确定性的文字匹配"
				};
				case "regex-invalid": return {
					title: "表达式无效",
					detail: "该条目的正则关键词无法解析，已跳过且不会影响其他条目"
				};
				case "regex-execution-limit": return {
					title: "已安全中止",
					detail: "该条目的正则匹配超过执行上限，已在隔离环境中停止"
				};
				case "regex-resource-limit": return {
					title: "超过安全上限",
					detail: "该条目的正则输入或累计评估量超过本轮上限"
				};
				case "primary-unmatched": return {
					title: "等待关键词",
					detail: entry.keys.length === 0 ? "没有可用于激活的主关键词" : "当前已发送的对话没有命中主关键词"
				};
				case "secondary-unmatched": return {
					title: "次要条件未满足",
					detail: "主关键词已经出现，但次要关键词规则尚未满足"
				};
				case "budget-excluded": return {
					title: "超出预算",
					detail: "条目已匹配，但本书的 token 预算优先保留了其他条目"
				};
				case "session-budget-excluded": return {
					title: "超出总预算",
					detail: "条目已匹配，但这段会话的世界书总预算优先保留了其他条目"
				};
			}
		}
		function editableFromProjection(entry) {
			return {
				...entry.name === void 0 ? {} : { name: entry.name },
				...entry.comment === void 0 ? {} : { comment: entry.comment },
				keys: entry.keys,
				secondaryKeys: entry.secondaryKeys,
				content: entry.content,
				enabled: entry.enabled,
				insertionOrder: entry.insertionOrder,
				selective: entry.selective,
				constant: entry.constant,
				caseSensitive: entry.caseSensitive,
				matchWholeWords: entry.matchWholeWords,
				secondaryLogic: entry.secondaryLogic,
				...entry.scanDepth === void 0 ? {} : { scanDepth: entry.scanDepth },
				position: entry.position,
				...entry.priority === void 0 ? {} : { priority: entry.priority },
				ignoreBudget: entry.ignoreBudget
			};
		}
		function WorldInfoManagerDialog({ worldInfo, onClose, onImport, onSave }) {
			const importInputRef = (0, react.useRef)(null);
			const first = worldInfo.books.flatMap((book) => book.entries.map((entry) => `${book.id}\u0000${entry.index}`))[0];
			const [selectedKey, setSelectedKey] = (0, react.useState)(first);
			const [editing, setEditing] = (0, react.useState)(false);
			const [draft, setDraft] = (0, react.useState)();
			const [saving, setSaving] = (0, react.useState)(false);
			const [importing, setImporting] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const [budgetDraft, setBudgetDraft] = (0, react.useState)(String(worldInfo.tokenBudget));
			(0, react.useEffect)(() => {
				setBudgetDraft(String(worldInfo.tokenBudget));
			}, [worldInfo.tokenBudget]);
			(0, react.useEffect)(() => {
				if (selectedKey === void 0 && first !== void 0) setSelectedKey(first);
			}, [first, selectedKey]);
			const pair = worldInfo.books.flatMap((book) => book.entries.map((entry) => ({
				book,
				entry
			}))).find(({ book, entry }) => `${book.id}\u0000${entry.index}` === selectedKey) ?? worldInfo.books.flatMap((book) => book.entries.map((entry) => ({
				book,
				entry
			})))[0];
			(0, react.useEffect)(() => {
				if (pair === void 0 || editing) return;
				setDraft(editableFromProjection(pair.entry));
			}, [
				pair?.book.id,
				pair?.entry.index,
				pair?.entry.modified,
				pair?.entry.deleted,
				editing
			]);
			const book = pair?.book;
			const entry = pair?.entry;
			const reason = entry === void 0 ? void 0 : worldInfoReason(entry);
			const hasOverrides = worldInfo.books.some((item) => item.entries.some((candidate) => candidate.modified || candidate.deleted));
			const mutate = (request, after) => {
				setSaving(true);
				setError(void 0);
				onSave(request).then(() => {
					setSaving(false);
					after?.();
				}, (saveError) => {
					setSaving(false);
					setError(saveError instanceof Error ? saveError.message : String(saveError));
				});
			};
			const importFile = (file) => {
				setImporting(true);
				setError(void 0);
				onImport(file).then(() => {
					setImporting(false);
				}, (importError) => {
					setImporting(false);
					setError(importError instanceof Error ? importError.message : String(importError));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-dialog": true,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "世界书",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.55)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "20px",
					position: "fixed",
					zIndex: 1002
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #171719)",
						border: "1px solid var(--dsw-alias-border-l2, #39393c)",
						borderRadius: "16px",
						boxShadow: "0 24px 90px rgba(0,0,0,.38)",
						display: "flex",
						flexDirection: "column",
						maxHeight: "calc(100vh - 40px)",
						maxWidth: "1080px",
						overflow: "hidden",
						width: "min(1080px, calc(100vw - 40px))"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								alignItems: "center",
								borderBottom: "1px solid var(--dsw-alias-border-l2, #39393c)",
								display: "flex",
								flexWrap: "wrap",
								gap: "12px",
								padding: "17px 20px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: {
										fontSize: "18px",
										margin: 0
									},
									children: "世界书"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										fontSize: "12px",
										marginTop: "4px",
										opacity: .52
									},
									children: [
										worldInfo.books.length,
										" 本 · ",
										worldInfo.books.reduce((sum, item) => sum + item.entries.length, 0),
										" 条 · 当前激活 ",
										worldInfo.activeCount,
										" 条 · 约 ",
										worldInfo.approximateTokens,
										"/",
										worldInfo.tokenBudget,
										" tokens",
										worldInfo.budgetExcludedCount > 0 ? ` · ${worldInfo.budgetExcludedCount} 条超出总预算` : ""
									]
								})] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									ref: importInputRef,
									type: "file",
									accept: "application/json,.json",
									hidden: true,
									onChange: (event) => {
										const file = event.currentTarget.files?.[0];
										event.currentTarget.value = "";
										if (file !== void 0) importFile(file);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
									onSubmit: (event) => {
										event.preventDefault();
										const tokenBudget = Number(budgetDraft);
										if (!Number.isSafeInteger(tokenBudget) || tokenBudget < 0 || tokenBudget > 1e5) {
											setError("世界书总预算需要是 0 到 100000 的整数");
											return;
										}
										mutate({
											operation: "set-budget",
											revision: worldInfo.revision,
											tokenBudget
										});
									},
									style: {
										alignItems: "center",
										display: "flex",
										gap: "6px",
										marginLeft: "auto"
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "agent-rp-world-info-budget",
											style: {
												fontSize: "11px",
												opacity: .58,
												whiteSpace: "nowrap"
											},
											children: "总预算"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											id: "agent-rp-world-info-budget",
											inputMode: "numeric",
											min: 0,
											max: 1e5,
											step: 1,
											type: "number",
											value: budgetDraft,
											onChange: (event) => {
												setBudgetDraft(event.currentTarget.value);
											},
											style: {
												background: "var(--dsw-alias-bg-layer-1, #222226)",
												border: "1px solid var(--dsw-alias-border-l2, #414146)",
												borderRadius: "8px",
												color: "inherit",
												font: "inherit",
												fontSize: "12px",
												padding: "6px 8px",
												width: "76px"
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "submit",
											disabled: saving || budgetDraft === String(worldInfo.tokenBudget),
											style: generationButtonStyle,
											children: "应用"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: importing,
									onClick: () => {
										importInputRef.current?.click();
									},
									style: generationButtonStyle,
									children: importing ? "导入中…" : "导入世界书"
								}),
								hasOverrides && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: saving,
									onClick: () => {
										mutate({
											operation: "reset-all",
											revision: worldInfo.revision
										}, () => {
											setEditing(false);
										});
									},
									style: generationButtonStyle,
									children: "全部恢复原始设置"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "关闭世界书",
									onClick: onClose,
									style: {
										background: "transparent",
										border: 0,
										color: "inherit",
										cursor: "pointer",
										fontSize: "23px",
										padding: "3px 6px"
									},
									children: "×"
								})
							]
						}),
						pair === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								alignItems: "center",
								display: "flex",
								flex: 1,
								flexDirection: "column",
								justifyContent: "center",
								minHeight: "300px",
								padding: "30px",
								textAlign: "center"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "28px",
										opacity: .38
									},
									children: "◇"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									style: {
										fontSize: "16px",
										margin: "14px 0 0"
									},
									children: "还没有世界书"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										fontSize: "13px",
										lineHeight: 1.65,
										margin: "8px 0 0",
										maxWidth: "430px",
										opacity: .58
									},
									children: "导入 SillyTavern World Info JSON 后会立即用于这段角色对话，不需要发送消息，也不会交给模型判断"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: importing,
									onClick: () => {
										importInputRef.current?.click();
									},
									style: {
										...primaryButtonStyle,
										marginTop: "18px"
									},
									children: importing ? "正在导入…" : "选择世界书 JSON"
								}),
								error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									role: "alert",
									style: {
										color: "#e88989",
										fontSize: "12px",
										lineHeight: 1.55,
										marginTop: "14px"
									},
									children: error
								})
							]
						}),
						pair !== void 0 && book !== void 0 && entry !== void 0 && reason !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flex: 1,
								flexWrap: "wrap",
								minHeight: 0,
								overflowY: "auto"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
								"aria-label": "世界书条目",
								style: {
									borderRight: "1px solid var(--dsw-alias-border-l2, #39393c)",
									boxSizing: "border-box",
									flex: "1 1 250px",
									maxWidth: "330px",
									minWidth: "230px",
									padding: "12px 10px 18px"
								},
								children: worldInfo.books.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									style: { marginBottom: "15px" },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											alignItems: "baseline",
											display: "flex",
											fontSize: "11px",
											fontWeight: 650,
											gap: "6px",
											opacity: .5,
											padding: "4px 8px 7px"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: item.name
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												marginLeft: "auto",
												whiteSpace: "nowrap"
											},
											children: item.source === "character" ? "角色卡" : "外部"
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											display: "grid",
											gap: "5px"
										},
										children: item.entries.map((candidate) => {
											const key = `${item.id}\u0000${candidate.index}`;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												"aria-current": key === selectedKey,
												onClick: () => {
													setSelectedKey(key);
													setEditing(false);
													setError(void 0);
												},
												style: {
													alignItems: "center",
													background: key === selectedKey ? `color-mix(in srgb, ${color} 14%, transparent)` : "transparent",
													border: key === selectedKey ? `1px solid color-mix(in srgb, ${color} 34%, transparent)` : "1px solid transparent",
													borderRadius: "9px",
													color: "inherit",
													cursor: "pointer",
													display: "grid",
													font: "inherit",
													gridTemplateColumns: "8px minmax(0, 1fr)",
													gap: "8px",
													padding: "9px 8px",
													textAlign: "left"
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													"aria-hidden": "true",
													style: {
														background: candidate.active ? "#75c79a" : candidate.deleted || !candidate.enabled ? "#6d6d72" : "#c5a769",
														borderRadius: "50%",
														height: "7px",
														width: "7px"
													}
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: { minWidth: 0 },
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														style: {
															display: "block",
															fontSize: "12px",
															fontWeight: 580,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap"
														},
														children: worldInfoEntryTitle(candidate)
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														style: {
															display: "block",
															fontSize: "10px",
															marginTop: "3px",
															opacity: .45
														},
														children: [worldInfoReason(candidate).title, candidate.modified ? " · 已修改" : ""]
													})]
												})]
											}, key);
										})
									})]
								}, item.id))
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("main", {
								style: {
									boxSizing: "border-box",
									flex: "2 1 480px",
									minWidth: 0,
									padding: "22px 24px 28px"
								},
								children: [
									!editing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												alignItems: "flex-start",
												display: "flex",
												gap: "12px"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: { minWidth: 0 },
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
													style: {
														fontSize: "17px",
														margin: 0
													},
													children: worldInfoEntryTitle(entry)
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													style: {
														fontSize: "11px",
														marginTop: "5px",
														opacity: .48
													},
													children: [
														book.name,
														" · #",
														entry.sourceId,
														" · 顺序 ",
														entry.insertionOrder
													]
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													background: entry.active ? "rgba(76,178,119,.13)" : "var(--dsw-alias-bg-layer-1, #222226)",
													border: `1px solid ${entry.active ? "rgba(91,200,139,.33)" : "var(--dsw-alias-border-l2, #414146)"}`,
													borderRadius: "999px",
													fontSize: "11px",
													marginLeft: "auto",
													padding: "5px 9px",
													whiteSpace: "nowrap"
												},
												children: reason.title
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											style: {
												fontSize: "12px",
												lineHeight: 1.6,
												margin: "14px 0 0",
												opacity: .6
											},
											children: reason.detail
										}),
										(entry.matchedKeys.length > 0 || entry.matchedSecondaryKeys.length > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												display: "flex",
												flexWrap: "wrap",
												gap: "6px",
												marginTop: "12px"
											},
											children: [...entry.matchedKeys, ...entry.matchedSecondaryKeys].map((key, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													...chipStyle,
													color: "#91d8ae"
												},
												children: ["命中 · ", key]
											}, `${key}-${index}`))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											style: {
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #39393c)",
												borderRadius: "11px",
												marginTop: "18px",
												padding: "14px 15px"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												style: {
													fontSize: "11px",
													fontWeight: 650,
													opacity: .48
												},
												children: "设定正文"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												style: {
													fontSize: "13px",
													lineHeight: 1.72,
													marginTop: "8px",
													maxHeight: "240px",
													overflowY: "auto",
													whiteSpace: "pre-wrap"
												},
												children: entry.content || "（空）"
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "grid",
												gap: "12px",
												gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
												marginTop: "17px"
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
													title: "主关键词",
													text: entry.constant ? "常驻，无需关键词" : entry.keys.join("、") || "未设置"
												}),
												entry.selective && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
													title: "次要关键词",
													text: entry.secondaryKeys.join("、") || "未设置"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
													title: "注入位置",
													text: entry.position === "before_char" ? "角色设定之前" : "角色设定之后"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailSection, {
													title: "估算占用",
													text: `约 ${entry.approximateTokens} tokens${book.tokenBudget === void 0 ? "" : ` · 本书预算 ${book.tokenBudget}`}`
												})
											]
										}),
										(entry.useRegex || entry.hasDecorators || book.recursiveScanning || book.degradations.length > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
											style: {
												fontSize: "12px",
												lineHeight: 1.65,
												marginTop: "17px",
												opacity: .68
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
												style: { cursor: "pointer" },
												children: "兼容性信息"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												style: { marginTop: "7px" },
												children: [
													entry.useRegex ? "正则关键词在受限 QuickJS 环境中执行" : "",
													entry.hasDecorators ? "装饰器已保留，当前不执行" : "",
													book.recursiveScanning ? "递归扫描已保留，当前不执行" : "",
													...book.degradations
												].filter(Boolean).join("\n")
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												flexWrap: "wrap",
												gap: "8px",
												marginTop: "22px"
											},
											children: [
												!entry.deleted && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: saving,
													onClick: () => {
														mutate({
															operation: "toggle",
															revision: worldInfo.revision,
															bookId: book.id,
															entryIndex: entry.index,
															enabled: !entry.enabled
														});
													},
													style: generationButtonStyle,
													children: entry.enabled ? "关闭条目" : "打开条目"
												}),
												!entry.deleted && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: saving,
													onClick: () => {
														setDraft(editableFromProjection(entry));
														setEditing(true);
													},
													style: generationButtonStyle,
													children: "编辑"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: saving,
													onClick: () => {
														mutate({
															operation: "delete",
															revision: worldInfo.revision,
															bookId: book.id,
															entryIndex: entry.index,
															deleted: !entry.deleted
														});
													},
													style: generationButtonStyle,
													children: entry.deleted ? "恢复条目" : "从本会话移除"
												}),
												(entry.modified || entry.deleted) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: saving,
													onClick: () => {
														mutate({
															operation: "reset-entry",
															revision: worldInfo.revision,
															bookId: book.id,
															entryIndex: entry.index
														});
													},
													style: {
														...generationButtonStyle,
														marginLeft: "auto"
													},
													children: "恢复原始条目"
												})
											]
										})
									] }),
									editing && draft !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorldInfoEntryEditor, {
										draft,
										saving,
										onCancel: () => {
											setEditing(false);
											setError(void 0);
										},
										onSave: (value) => mutate({
											operation: "edit",
											revision: worldInfo.revision,
											bookId: book.id,
											entryIndex: entry.index,
											entry: value
										}, () => {
											setEditing(false);
										})
									}),
									error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										role: "alert",
										style: {
											color: "#e88989",
											fontSize: "12px",
											lineHeight: 1.55,
											marginTop: "14px"
										},
										children: error
									})
								]
							})]
						}) })
					]
				})
			});
		}
		function WorldInfoEntryEditor({ draft, saving, onCancel, onSave }) {
			const [value, setValue] = (0, react.useState)(draft);
			const inputStyle = {
				background: "var(--dsw-alias-bg-layer-1, #202024)",
				border: "1px solid var(--dsw-alias-border-l2, #414146)",
				borderRadius: "8px",
				boxSizing: "border-box",
				color: "inherit",
				font: "inherit",
				padding: "8px 9px",
				width: "100%"
			};
			const list = (source) => source.split(/[,，\n]/u).map((item) => item.trim()).filter(Boolean);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				onSubmit: (event) => {
					event.preventDefault();
					onSave(value);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						alignItems: "center",
						display: "flex",
						gap: "10px"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							style: {
								fontSize: "17px",
								margin: 0
							},
							children: "编辑世界书条目"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: "11px",
								marginTop: "5px",
								opacity: .48
							},
							children: "修改只作用于当前会话，原文件不会被覆盖"
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onCancel,
							style: {
								...generationButtonStyle,
								marginLeft: "auto"
							},
							children: "取消"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: saving || value.content.trim() === "",
							style: {
								...generationButtonStyle,
								opacity: value.content.trim() === "" ? .35 : 1
							},
							children: saving ? "保存中…" : "保存"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gap: "13px",
						marginTop: "19px"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: { fontSize: "12px" },
							children: ["名称", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								value: value.name ?? "",
								onChange: (event) => {
									setValue((current) => ({
										...current,
										name: event.target.value
									}));
								},
								style: {
									...inputStyle,
									marginTop: "6px"
								},
								placeholder: "可选；留白时显示首个关键词"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: { fontSize: "12px" },
							children: ["设定正文", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								value: value.content,
								rows: 8,
								onChange: (event) => {
									setValue((current) => ({
										...current,
										content: event.target.value
									}));
								},
								style: {
									...inputStyle,
									lineHeight: 1.65,
									marginTop: "6px",
									resize: "vertical"
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gap: "12px",
								gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: { fontSize: "12px" },
								children: ["主关键词", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: value.keys.join("\n"),
									rows: 3,
									disabled: value.constant,
									onChange: (event) => {
										setValue((current) => ({
											...current,
											keys: list(event.target.value)
										}));
									},
									style: {
										...inputStyle,
										lineHeight: 1.5,
										marginTop: "6px",
										opacity: value.constant ? .45 : 1,
										resize: "vertical"
									},
									placeholder: "每行或逗号分隔"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: { fontSize: "12px" },
								children: ["次要关键词", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: value.secondaryKeys.join("\n"),
									rows: 3,
									disabled: !value.selective || value.constant,
									onChange: (event) => {
										setValue((current) => ({
											...current,
											secondaryKeys: list(event.target.value)
										}));
									},
									style: {
										...inputStyle,
										lineHeight: 1.5,
										marginTop: "6px",
										opacity: !value.selective || value.constant ? .45 : 1,
										resize: "vertical"
									},
									placeholder: "每行或逗号分隔"
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								flexWrap: "wrap",
								gap: "14px 20px"
							},
							children: [
								["enabled", "启用条目"],
								["constant", "常驻"],
								["selective", "使用次要关键词"],
								["caseSensitive", "区分大小写"],
								["matchWholeWords", "完整词匹配"],
								["ignoreBudget", "忽略预算"]
							].map(([key, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									alignItems: "center",
									display: "flex",
									fontSize: "12px",
									gap: "7px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: value[key],
									onChange: (event) => {
										setValue((current) => ({
											...current,
											[key]: event.target.checked
										}));
									}
								}), label]
							}, key))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gap: "12px",
								gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: { fontSize: "12px" },
									children: ["注入位置", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										value: value.position,
										onChange: (event) => {
											setValue((current) => ({
												...current,
												position: event.target.value
											}));
										},
										style: {
											...inputStyle,
											marginTop: "6px"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "before_char",
											children: "角色设定之前"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "after_char",
											children: "角色设定之后"
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: { fontSize: "12px" },
									children: ["次要条件", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										disabled: !value.selective,
										value: value.secondaryLogic,
										onChange: (event) => {
											setValue((current) => ({
												...current,
												secondaryLogic: event.target.value
											}));
										},
										style: {
											...inputStyle,
											marginTop: "6px",
											opacity: value.selective ? 1 : .45
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "and-any",
												children: "任意命中"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "and-all",
												children: "全部命中"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "not-any",
												children: "全部不出现"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "not-all",
												children: "不是全部出现"
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: { fontSize: "12px" },
									children: ["顺序", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "number",
										value: value.insertionOrder,
										onChange: (event) => {
											setValue((current) => ({
												...current,
												insertionOrder: Number(event.target.value)
											}));
										},
										style: {
											...inputStyle,
											marginTop: "6px"
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: { fontSize: "12px" },
									children: ["扫描深度", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "number",
										min: 0,
										value: value.scanDepth ?? "",
										placeholder: "继承世界书",
										onChange: (event) => {
											setValue((current) => {
												const next = { ...current };
												if (event.target.value === "") delete next.scanDepth;
												else next.scanDepth = Number(event.target.value);
												return next;
											});
										},
										style: {
											...inputStyle,
											marginTop: "6px"
										}
									})]
								})
							]
						})
					]
				})]
			});
		}
		function tavernHelperSummaryText(summary) {
			return [
				summary.format === "entries" ? "条目数组" : "对象格式",
				`${summary.enabledScriptCount}/${summary.scriptCount} 条脚本启用`,
				`${summary.variableCount} 个变量`,
				summary.ignoredFieldCount === 0 ? void 0 : `${summary.ignoredFieldCount} 个扩展字段未接管`
			].filter((value) => value !== void 0).join(" · ");
		}
		function presetTavernHelperSummaryText(summary) {
			const missing = summary.expectedScriptCount === void 0 ? 0 : Math.max(0, summary.expectedScriptCount - summary.scriptCount);
			return [
				summary.format === "entries" ? "条目数组" : summary.format === "object" ? "对象格式" : void 0,
				missing > 0 ? `旧导入缺少 ${missing} 个脚本，建议重新导入` : `${summary.enabledScriptCount}/${summary.scriptCount} 条脚本启用`,
				summary.variableCount === void 0 ? void 0 : `${summary.variableCount} 个变量`,
				summary.ignoredFieldCount === void 0 || summary.ignoredFieldCount === 0 ? void 0 : `${summary.ignoredFieldCount} 个扩展字段未接管`
			].filter((value) => value !== void 0).join(" · ");
		}
		function characterDegradationLabel(value) {
			switch (value) {
				case "character-assets": return "外部角色资源";
				case "future-card-version": return "未来版本字段";
				case "group-greetings": return "群聊开场";
				case "lorebook-decorators": return "世界书装饰器";
				case "lorebook-regex": return "世界书正则";
				case "lorebook-recursion": return "世界书递归";
				case "remote-assets": return "远程资源";
			}
		}
		function CharacterLibraryDialog({ currentCharacterName, currentCharacterId, listCharacters, readCharacter, setCharacterArchived, importCharacterFile, listPresets, importPresetFile, listPersonas, savePersona, deletePersona, onClose, onStart }) {
			const narrow = useNarrowCharacterLibrary();
			const [collection, setCollection] = (0, react.useState)("active");
			const [characterQuery, setCharacterQuery] = (0, react.useState)("");
			const [entries, setEntries] = (0, react.useState)();
			const [selected, setSelected] = (0, react.useState)();
			const [greetingIndex, setGreetingIndex] = (0, react.useState)(0);
			const [expandedGreetingIndex, setExpandedGreetingIndex] = (0, react.useState)(0);
			const { entries: presets, error: presetError, presetId, selectPreset, selectImportedPreset, renamePreset } = usePresetPreference(listPresets);
			const [personas, setPersonas] = (0, react.useState)();
			const [personaId, setPersonaId] = (0, react.useState)("");
			const [editingPersona, setEditingPersona] = (0, react.useState)(false);
			const [personaEditorId, setPersonaEditorId] = (0, react.useState)();
			const [personaName, setPersonaName] = (0, react.useState)("");
			const [personaDescription, setPersonaDescription] = (0, react.useState)("");
			const [copyActiveMemory, setCopyActiveMemory] = (0, react.useState)(false);
			const [savingPersona, setSavingPersona] = (0, react.useState)(false);
			const [confirmingPersonaId, setConfirmingPersonaId] = (0, react.useState)();
			const [removingPersonaId, setRemovingPersonaId] = (0, react.useState)();
			const [loadingId, setLoadingId] = (0, react.useState)();
			const [starting, setStarting] = (0, react.useState)(false);
			const [updating, setUpdating] = (0, react.useState)(false);
			const [importing, setImporting] = (0, react.useState)(false);
			const [importingPreset, setImportingPreset] = (0, react.useState)(false);
			const [renamingPreset, setRenamingPreset] = (0, react.useState)(false);
			const [draggingFile, setDraggingFile] = (0, react.useState)(false);
			const [actionNotice, setActionNotice] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const fileInputRef = (0, react.useRef)(null);
			const presetInputRef = (0, react.useRef)(null);
			const selectionRequestRef = (0, react.useRef)(0);
			(0, react.useEffect)(() => {
				let current = true;
				selectionRequestRef.current += 1;
				setEntries(void 0);
				setSelected(void 0);
				setExpandedGreetingIndex(void 0);
				setError(void 0);
				listCharacters(collection).then((value) => {
					if (!current) return;
					setEntries(value);
					const preferred = collection === "active" ? value.find((entry) => entry.displayName === currentCharacterName) ?? value[0] : value[0];
					if (preferred === void 0) return;
					const request = ++selectionRequestRef.current;
					setLoadingId(preferred.id);
					readCharacter(preferred.id).then((detail) => {
						if (!current || selectionRequestRef.current !== request) return;
						setSelected(detail);
						setGreetingIndex(0);
						setExpandedGreetingIndex(0);
						setLoadingId(void 0);
					}, (readError) => {
						if (!current || selectionRequestRef.current !== request) return;
						setLoadingId(void 0);
						setError(readError instanceof Error ? readError.message : String(readError));
					});
				}, (listError) => {
					if (!current) return;
					setEntries([]);
					setError(listError instanceof Error ? listError.message : String(listError));
				});
				return () => {
					current = false;
				};
			}, [
				collection,
				currentCharacterName,
				listCharacters,
				readCharacter
			]);
			(0, react.useEffect)(() => {
				let current = true;
				listPersonas().then((value) => {
					if (!current) return;
					setPersonas(value);
					setPersonaId("");
				}, (listError) => {
					if (!current) return;
					setPersonas([]);
					setError(listError instanceof Error ? listError.message : String(listError));
				});
				return () => {
					current = false;
				};
			}, [listPersonas]);
			(0, react.useEffect)(() => {
				if (selected?.id !== currentCharacterId) setCopyActiveMemory(false);
			}, [currentCharacterId, selected?.id]);
			const choose = (entry) => {
				const request = ++selectionRequestRef.current;
				setLoadingId(entry.id);
				setError(void 0);
				readCharacter(entry.id).then((detail) => {
					if (selectionRequestRef.current !== request) return;
					setSelected(detail);
					setGreetingIndex(0);
					setExpandedGreetingIndex(0);
					setLoadingId(void 0);
				}, (readError) => {
					if (selectionRequestRef.current !== request) return;
					setLoadingId(void 0);
					setError(readError instanceof Error ? readError.message : String(readError));
				});
			};
			const updateArchiveState = () => {
				if (selected === void 0) return;
				const archived = collection === "active";
				const displayName = selected.displayName;
				setUpdating(true);
				setError(void 0);
				setCharacterArchived(selected.id, archived).then(() => listCharacters(collection)).then((value) => {
					setEntries(value);
					const normalizedQuery = characterQuery.trim().toLocaleLowerCase();
					const next = value.find((entry) => normalizedQuery === "" || [
						entry.displayName,
						entry.name,
						entry.originalFilename
					].some((text) => text.toLocaleLowerCase().includes(normalizedQuery)));
					if (next === void 0) {
						setSelected(void 0);
						setExpandedGreetingIndex(void 0);
						setLoadingId(void 0);
						setUpdating(false);
						setActionNotice(`${archived ? "已移入收纳箱" : "已移回角色库"}「${displayName}」`);
						return;
					}
					setLoadingId(next.id);
					return readCharacter(next.id).then((detail) => {
						setSelected(detail);
						setGreetingIndex(0);
						setExpandedGreetingIndex(0);
						setLoadingId(void 0);
						setUpdating(false);
						setActionNotice(`${archived ? "已移入收纳箱" : "已移回角色库"}「${displayName}」`);
					});
				}).catch((updateError) => {
					setLoadingId(void 0);
					setUpdating(false);
					setError(updateError instanceof Error ? updateError.message : String(updateError));
				});
			};
			const importFile = (file) => {
				setImporting(true);
				setDraggingFile(false);
				setError(void 0);
				setActionNotice(void 0);
				importCharacterFile(file).then((result) => listCharacters("active").then((value) => ({
					result,
					value
				}))).then(({ result, value }) => {
					const { entry, outcome } = result;
					setCollection("active");
					setCharacterQuery("");
					setEntries(value);
					setSelected(entry);
					setGreetingIndex(0);
					setExpandedGreetingIndex(0);
					setLoadingId(void 0);
					setImporting(false);
					const notice = outcome === "created" ? `已加入角色库「${entry.displayName}」` : outcome === "restored" ? `已恢复「${entry.displayName}」` : `角色库中已有「${entry.displayName}」`;
					setActionNotice(`${notice}${entry.tavernHelper === void 0 ? "" : ` · Tavern Helper：${tavernHelperSummaryText(entry.tavernHelper)}`}`);
				}).catch((importError) => {
					setImporting(false);
					setError(importError instanceof Error ? importError.message : String(importError));
				});
			};
			const importPresetSelection = (file) => {
				setImportingPreset(true);
				setError(void 0);
				setActionNotice(void 0);
				importPresetFile(file).then((entry) => {
					selectImportedPreset(entry);
					setImportingPreset(false);
					setActionNotice(`已导入并选中预设「${entry.name}」`);
				}, (importError) => {
					setImportingPreset(false);
					setError(importError instanceof Error ? importError.message : String(importError));
				});
			};
			const normalizedCharacterQuery = characterQuery.trim().toLocaleLowerCase();
			const visibleEntries = (entries ?? []).filter((entry) => normalizedCharacterQuery === "" || [
				entry.displayName,
				entry.name,
				entry.originalFilename
			].some((text) => text.toLocaleLowerCase().includes(normalizedCharacterQuery)));
			const duplicateNames = new Set((entries ?? []).filter((entry, index, all) => all.findIndex((candidate) => candidate.displayName === entry.displayName) !== index).map((entry) => entry.displayName));
			const greetingSummaries = (0, react.useMemo)(() => selected?.greetings.map((greeting, index) => compactCharacterDisplayText(selected.renderedGreetings[index] ?? greeting)) ?? [], [selected]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "agent-rp-character-library-overlay",
				"data-agent-rp-dialog": true,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "角色库",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.52)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "clamp(8px, 3vw, 24px)",
					position: "fixed",
					zIndex: 1001
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: "agent-rp-character-library-dialog",
					style: {
						background: "var(--dsw-alias-bg-base, #171719)",
						border: "1px solid var(--dsw-alias-border-l2, #39393c)",
						borderRadius: "16px",
						boxShadow: "0 22px 80px rgba(0,0,0,.36)",
						display: "grid",
						gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "minmax(260px, 320px) minmax(0, 1fr)",
						gridTemplateRows: narrow ? "minmax(240px, .8fr) minmax(0, 1.2fr)" : void 0,
						height: "min(680px, calc(100vh - clamp(16px, 6vw, 48px)))",
						maxWidth: "1180px",
						overflow: "hidden",
						width: "min(1180px, calc(100vw - clamp(16px, 6vw, 48px)))"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							borderBottom: narrow ? "1px solid var(--dsw-alias-border-l2, #39393c)" : void 0,
							borderRight: narrow ? void 0 : "1px solid var(--dsw-alias-border-l2, #39393c)",
							display: "flex",
							flexDirection: "column",
							minHeight: 0
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								padding: narrow ? "14px 14px 10px" : "22px 20px 14px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: {
										fontSize: "18px",
										margin: 0
									},
									children: "角色库"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									role: "tablist",
									"aria-label": "角色库分区",
									style: {
										background: "var(--dsw-alias-bg-layer-1, #202024)",
										borderRadius: "9px",
										display: "grid",
										gap: "3px",
										gridTemplateColumns: "1fr 1fr",
										marginTop: "12px",
										padding: "3px"
									},
									children: [["active", "角色卡"], ["archived", "收纳箱"]].map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "tab",
										"aria-selected": collection === value,
										onClick: () => {
											setCollection(value);
											setCharacterQuery("");
										},
										style: {
											background: collection === value ? `color-mix(in srgb, ${color} 15%, transparent)` : "transparent",
											border: 0,
											borderRadius: "7px",
											color: "inherit",
											cursor: "pointer",
											font: "inherit",
											fontSize: "12px",
											fontWeight: collection === value ? 620 : 400,
											padding: "7px 8px"
										},
										children: label
									}, value))
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "search",
									value: characterQuery,
									"aria-label": "搜索角色",
									placeholder: "搜索角色或文件名",
									onChange: (event) => {
										const value = event.target.value;
										const normalized = value.trim().toLocaleLowerCase();
										const matches = (entry) => normalized === "" || [
											entry.displayName,
											entry.name,
											entry.originalFilename
										].some((text) => text.toLocaleLowerCase().includes(normalized));
										const next = (entries ?? []).find(matches);
										setCharacterQuery(value);
										if (next === void 0) {
											selectionRequestRef.current += 1;
											setSelected(void 0);
											setExpandedGreetingIndex(void 0);
											setLoadingId(void 0);
										} else if (selected === void 0 || !matches(selected)) choose(next);
									},
									style: {
										background: "var(--dsw-alias-bg-layer-1, #202024)",
										border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
										borderRadius: "9px",
										boxSizing: "border-box",
										color: "inherit",
										font: "inherit",
										fontSize: "12px",
										marginTop: "10px",
										order: 2,
										outline: "none",
										padding: "8px 10px",
										width: "100%"
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									ref: fileInputRef,
									type: "file",
									accept: ".png,.json,.charx,image/png,application/json,application/zip",
									hidden: true,
									onChange: (event) => {
										const file = event.target.files?.[0];
										event.target.value = "";
										if (file !== void 0) importFile(file);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									disabled: importing,
									onClick: () => {
										fileInputRef.current?.click();
									},
									onDragEnter: (event) => {
										event.preventDefault();
										setDraggingFile(true);
									},
									onDragOver: (event) => {
										event.preventDefault();
										event.dataTransfer.dropEffect = "copy";
										setDraggingFile(true);
									},
									onDragLeave: (event) => {
										if (!event.currentTarget.contains(event.relatedTarget)) setDraggingFile(false);
									},
									onDrop: (event) => {
										event.preventDefault();
										const file = event.dataTransfer.files[0];
										if (file === void 0) setDraggingFile(false);
										else importFile(file);
									},
									style: {
										background: `color-mix(in srgb, ${color} ${draggingFile ? 20 : 11}%, transparent)`,
										border: `1px ${draggingFile ? "solid" : "dashed"} color-mix(in srgb, ${color} ${draggingFile ? 75 : 42}%, transparent)`,
										borderRadius: "9px",
										color: "inherit",
										cursor: importing ? "wait" : "pointer",
										display: "block",
										font: "inherit",
										marginTop: "10px",
										opacity: importing ? .58 : 1,
										order: 1,
										padding: "11px 12px",
										textAlign: "left",
										width: "100%"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											display: "block",
											fontSize: "13px",
											fontWeight: 650
										},
										children: importing ? "正在导入…" : draggingFile ? "松开即可导入" : "＋ 导入角色卡"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											display: "block",
											fontSize: "10px",
											marginTop: "3px",
											opacity: .5
										},
										children: "PNG · JSON · CHARX，也可拖到这里"
									})]
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gap: "6px",
								minHeight: 0,
								overflowX: "hidden",
								overflowY: "auto",
								padding: "4px 10px 18px"
							},
							children: [
								entries === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "13px",
										opacity: .55,
										padding: "16px 10px"
									},
									children: "正在读取角色…"
								}),
								entries?.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "13px",
										lineHeight: 1.65,
										opacity: .62,
										padding: "16px 10px"
									},
									children: collection === "active" ? "角色库还是空的。导入一张角色卡后，它会自动保存在这里" : "收纳箱还是空的"
								}),
								entries !== void 0 && entries.length > 0 && visibleEntries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "13px",
										lineHeight: 1.65,
										opacity: .62,
										padding: "16px 10px"
									},
									children: "没有找到匹配的角色"
								}),
								visibleEntries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-pressed": selected?.id === entry.id,
									onClick: () => {
										choose(entry);
									},
									style: {
										alignItems: "center",
										background: selected?.id === entry.id ? `color-mix(in srgb, ${color} 15%, transparent)` : "transparent",
										border: selected?.id === entry.id ? `1px solid color-mix(in srgb, ${color} 36%, transparent)` : "1px solid transparent",
										borderRadius: "10px",
										color: "inherit",
										cursor: "pointer",
										display: "flex",
										font: "inherit",
										gap: "10px",
										padding: "9px",
										textAlign: "left"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterLibraryAvatar, { entry }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											flex: 1,
											minWidth: 0
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											title: entry.displayName,
											style: {
												display: "-webkit-box",
												fontSize: "13px",
												fontWeight: 620,
												lineHeight: 1.35,
												overflow: "hidden",
												WebkitBoxOrient: "vertical",
												WebkitLineClamp: 2
											},
											children: [entry.displayName, loadingId === entry.id ? " · 读取中" : ""]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												fontSize: "11px",
												marginTop: "5px",
												opacity: .5,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: [
												duplicateNames.has(entry.displayName) ? `同名 · ${entry.originalFilename} · ${new Date(entry.importedAt).toLocaleString("zh-CN", { hour12: false })} · ` : "",
												"V",
												entry.cardVersion,
												" · ",
												entry.greetingCount,
												" 个开场",
												entry.worldInfoCount === 0 ? "" : ` · ${entry.worldInfoCount} 条世界书`,
												entry.regexScriptCount === 0 ? "" : ` · ${entry.regexScriptCount} 条正则`,
												entry.imageAssetCount === 0 ? "" : ` · ${entry.imageAssetCount} 张图片`
											]
										})]
									})]
								}, entry.id))
							]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							minHeight: 0
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								style: {
									alignItems: "center",
									display: "flex",
									padding: "18px 20px 12px"
								},
								children: [
									selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterLibraryAvatar, {
										entry: selected,
										size: 42
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											marginLeft: selected === void 0 ? 0 : "11px",
											minWidth: 0
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
											style: {
												display: "block",
												fontSize: "17px",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: selected?.displayName ?? "选择角色"
										}), selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											title: selected.originalFilename,
											style: {
												display: "block",
												fontSize: "11px",
												marginTop: "3px",
												opacity: .46,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: selected.originalFilename
										})]
									}),
									selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: updating,
										onClick: updateArchiveState,
										style: {
											background: "transparent",
											border: "1px solid var(--dsw-alias-border-l2, #444)",
											borderRadius: "8px",
											color: "inherit",
											cursor: updating ? "wait" : "pointer",
											font: "inherit",
											fontSize: "12px",
											marginLeft: "auto",
											padding: "6px 10px"
										},
										children: updating ? "处理中…" : collection === "active" ? "移到收纳箱" : "移回角色库"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "关闭角色库",
										onClick: onClose,
										style: {
											background: "transparent",
											border: 0,
											color: "inherit",
											cursor: "pointer",
											fontSize: "23px",
											marginLeft: selected === void 0 ? "auto" : "8px",
											padding: "4px 6px"
										},
										children: "×"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									flex: 1,
									minHeight: 0,
									overflowX: "hidden",
									overflowY: "auto",
									padding: "4px 20px 22px"
								},
								children: [
									selected === void 0 && entries !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											alignItems: "center",
											display: "flex",
											flexDirection: "column",
											height: "100%",
											justifyContent: "center",
											margin: "0 auto",
											maxWidth: "380px",
											minHeight: "240px",
											textAlign: "center"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												"aria-hidden": "true",
												style: {
													alignItems: "center",
													background: `color-mix(in srgb, ${color} 13%, transparent)`,
													borderRadius: "18px",
													color,
													display: "flex",
													fontSize: "24px",
													height: "54px",
													justifyContent: "center",
													width: "54px"
												},
												children: "✦"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
												style: {
													fontSize: "17px",
													marginTop: "16px"
												},
												children: collection === "archived" ? "收纳箱还是空的" : entries.length === 0 ? "从一张角色卡开始" : "没有匹配的角色"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												style: {
													fontSize: "13px",
													lineHeight: 1.65,
													margin: "8px 0 0",
													opacity: .58
												},
												children: collection === "archived" ? "放进收纳箱的角色仍完整保留在本机，随时可以移回角色库" : entries.length === 0 ? "支持 SillyTavern 的 PNG、JSON 和 CHARX。原始文件保存在本机；开始对话后，角色设定会提供给模型" : "换个关键词，或清空左侧搜索框"
											}),
											collection === "active" && entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												disabled: importing,
												onClick: () => {
													fileInputRef.current?.click();
												},
												style: {
													background: color,
													border: 0,
													borderRadius: "9px",
													color: "#fff",
													cursor: importing ? "wait" : "pointer",
													font: "inherit",
													fontWeight: 620,
													marginTop: "18px",
													opacity: importing ? .58 : 1,
													padding: "9px 15px"
												},
												children: importing ? "正在导入…" : "选择角色卡"
											})
										]
									}),
									selected !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterWorldInfoSection, { detail: selected }, selected.id),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterRegexScriptsSection, { scripts: selected.regexScripts }),
										selected.tavernHelper !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #39393c)",
												borderRadius: "10px",
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "4px 0 12px",
												padding: "9px 11px"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
												style: {
													display: "block",
													fontSize: "12px",
													marginBottom: "2px"
												},
												children: "Tavern Helper"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: { opacity: .58 },
												children: [tavernHelperSummaryText(selected.tavernHelper), " · 脚本在隔离运行时中执行"]
											})]
										}),
										selected.degradations.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												borderLeft: "2px solid color-mix(in srgb, #d6a24d 70%, transparent)",
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "4px 0 12px",
												opacity: .62,
												padding: "2px 0 2px 10px"
											},
											children: ["兼容提醒 · 尚未执行（原卡内容已保留）：", selected.degradations.map(characterDegradationLabel).join("、")]
										}),
										selected.localCorrectionCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												borderLeft: `2px solid color-mix(in srgb, ${color} 62%, transparent)`,
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "4px 0 12px",
												opacity: .62,
												padding: "2px 0 2px 10px"
											},
											children: [
												"本机已修正 ",
												selected.localCorrectionCount,
												" 处原文笔误；原始角色卡文件没有改动"
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterDisplayExtensionsSection, {
											detail: selected,
											onChange: (entry) => {
												setSelected(entry);
											},
											onNotice: (message) => {
												setActionNotice(message);
												setError(void 0);
											},
											onError: (message) => {
												setError(message === "" ? void 0 : message);
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterRemoteResourcesSection, {
											detail: selected,
											onChange: (entry) => {
												setSelected(entry);
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterAssetsSection, { detail: selected }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											style: {
												display: "block",
												fontSize: "12px",
												fontWeight: 620,
												margin: "8px 0 8px",
												opacity: .65
											},
											children: "选择开场"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												display: "grid",
												gap: "8px"
											},
											children: selected.greetings.map((greeting, index) => {
												const active = greetingIndex === index;
												const expanded = expandedGreetingIndex === index;
												const summary = greetingSummaries[index] ?? "";
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													style: {
														background: greetingIndex === index ? `color-mix(in srgb, ${color} 13%, transparent)` : "var(--dsw-alias-bg-layer-1, #202024)",
														border: greetingIndex === index ? `1px solid color-mix(in srgb, ${color} 38%, transparent)` : "1px solid var(--dsw-alias-border-l2, #39393c)",
														borderRadius: "10px",
														color: "inherit",
														overflow: "hidden"
													},
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
														type: "button",
														"aria-expanded": expanded,
														"aria-pressed": active,
														onClick: () => {
															if (active) {
																setExpandedGreetingIndex((current) => current === index ? void 0 : index);
																return;
															}
															setGreetingIndex(index);
															setExpandedGreetingIndex(index);
														},
														style: {
															background: "transparent",
															border: 0,
															color: "inherit",
															cursor: "pointer",
															display: "block",
															font: "inherit",
															lineHeight: 1.6,
															padding: "10px 12px",
															textAlign: "left",
															width: "100%"
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															style: {
																alignItems: "center",
																display: "flex",
																fontSize: "11px",
																fontWeight: 620,
																gap: "8px",
																justifyContent: "space-between",
																opacity: .56
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [index === 0 ? "默认开场" : `备选开场 ${index}`, active ? " · 已选择" : ""] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																style: {
																	alignItems: "center",
																	display: "flex",
																	flex: "none",
																	fontWeight: 400,
																	gap: "4px"
																},
																children: [expanded ? "收起" : "展开", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DisclosureChevron, { expanded })]
															})]
														}), !expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															style: {
																display: "-webkit-box",
																fontSize: "12px",
																lineHeight: 1.55,
																marginTop: "5px",
																opacity: .72,
																overflow: "hidden",
																WebkitBoxOrient: "vertical",
																WebkitLineClamp: 2
															},
															children: summary === "" ? "无开场白" : summary
														})]
													}), expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														style: {
															borderTop: "1px solid var(--dsw-alias-border-l2, #39393c)",
															padding: "10px 12px"
														},
														children: greeting.trim() === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															style: {
																fontSize: "13px",
																opacity: .58
															},
															children: "无开场白"
														}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterDisplay, {
															compilation: compileCharacterDisplay(selected.renderedGreetings[index] ?? greeting),
															statData: void 0,
															characterName: selected.displayName,
															character: selected,
															preview: true
														})
													})]
												}, index);
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												alignItems: "center",
												display: "flex",
												margin: "20px 0 8px"
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
													htmlFor: "agent-rp-session-preset",
													style: {
														fontSize: "12px",
														fontWeight: 620,
														opacity: .65
													},
													children: "对话预设"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													ref: presetInputRef,
													type: "file",
													accept: ".json,application/json",
													hidden: true,
													onChange: (event) => {
														const file = event.currentTarget.files?.[0];
														event.currentTarget.value = "";
														if (file !== void 0) importPresetSelection(file);
													}
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: importingPreset,
													onClick: () => {
														presetInputRef.current?.click();
													},
													style: {
														background: "transparent",
														border: 0,
														color,
														cursor: importingPreset ? "wait" : "pointer",
														font: "inherit",
														fontSize: "12px",
														marginLeft: "auto",
														padding: 0
													},
													children: importingPreset ? "正在导入…" : "导入预设"
												}),
												presetId !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: renamingPreset,
													onClick: () => {
														const preset = presets?.find((entry) => entry.id === presetId);
														if (preset === void 0) return;
														const name = window.prompt("预设名称", preset.name)?.trim();
														if (name === void 0 || name === "" || name === preset.name) return;
														setRenamingPreset(true);
														setError(void 0);
														renamePreset(preset.id, name).then((entry) => {
															setRenamingPreset(false);
															setActionNotice(`预设已改名为「${entry.name}」`);
														}, (reason) => {
															setRenamingPreset(false);
															setError(reason instanceof Error ? reason.message : String(reason));
														});
													},
													style: {
														background: "transparent",
														border: 0,
														color,
														cursor: renamingPreset ? "wait" : "pointer",
														font: "inherit",
														fontSize: "12px",
														marginLeft: "12px",
														padding: 0
													},
													children: renamingPreset ? "正在改名…" : "改名"
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: { position: "relative" },
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
												id: "agent-rp-session-preset",
												value: presetId,
												onChange: (event) => {
													selectPreset(event.target.value);
												},
												style: {
													appearance: "none",
													background: "var(--dsw-alias-bg-layer-1, #202024)",
													border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
													borderRadius: "9px",
													boxSizing: "border-box",
													color: "inherit",
													font: "inherit",
													padding: "9px 36px 9px 10px",
													width: "100%"
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "",
													children: "不使用预设"
												}), presets?.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: entry.id,
													children: presetLibraryOptionLabel(entry, presets)
												}, entry.id))]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectChevron, {})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												fontSize: "11px",
												lineHeight: 1.55,
												marginTop: "6px",
												opacity: .5
											},
											children: presetError !== void 0 ? presetError : presets === void 0 ? "正在读取预设…" : presets.length === 0 ? "预设库暂无内容，可在这里导入社区推荐的预设 JSON" : (() => {
												const preset = presets.find((entry) => entry.id === presetId);
												return preset === void 0 ? "新会话不会启用酒馆预设" : `${preset.enabledCount}/${preset.promptCount} 项启用${preset.regexScriptCount === 0 ? "" : ` · ${preset.regexScriptCount} 条正则`} · 开聊后可在「会话设置 → 预设」调整开关`;
											})()
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												alignItems: "center",
												display: "flex",
												margin: "20px 0 7px"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
												htmlFor: "agent-rp-session-persona",
												style: {
													fontSize: "12px",
													fontWeight: 620,
													opacity: .65
												},
												children: "你的身份（Persona）"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => {
													setEditingPersona((value) => !value);
													setPersonaEditorId(void 0);
													setPersonaName("");
													setPersonaDescription("");
													setConfirmingPersonaId(void 0);
												},
												style: {
													background: "transparent",
													border: 0,
													color,
													cursor: "pointer",
													font: "inherit",
													fontSize: "12px",
													marginLeft: "auto",
													padding: 0
												},
												children: editingPersona ? "收起" : "新建身份"
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: { position: "relative" },
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
												id: "agent-rp-session-persona",
												value: personaId,
												disabled: removingPersonaId !== void 0,
												onChange: (event) => {
													setPersonaId(event.target.value);
													setConfirmingPersonaId(void 0);
												},
												style: {
													appearance: "none",
													background: "var(--dsw-alias-bg-layer-1, #202024)",
													border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
													borderRadius: "9px",
													boxSizing: "border-box",
													color: "inherit",
													font: "inherit",
													padding: "9px 36px 9px 10px",
													width: "100%"
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "",
													children: "暂不设置"
												}), personas?.map((persona) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: persona.id,
													children: persona.name
												}, persona.id))]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectChevron, {})]
										}),
										personaId !== "" && (() => {
											const persona = personas?.find((entry) => entry.id === personaId);
											if (persona === void 0) return null;
											const confirming = confirmingPersonaId === persona.id;
											const removing = removingPersonaId === persona.id;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: { marginTop: "8px" },
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													style: {
														fontSize: "12px",
														lineHeight: 1.6,
														opacity: .58,
														whiteSpace: "pre-wrap"
													},
													children: persona.description || "只有称呼，没有额外人物设定"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														gap: "10px",
														marginTop: "7px"
													},
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															disabled: removing,
															onClick: () => {
																setEditingPersona(true);
																setPersonaEditorId(persona.id);
																setPersonaName(persona.name);
																setPersonaDescription(persona.description);
																setConfirmingPersonaId(void 0);
															},
															style: {
																background: "transparent",
																border: 0,
																color,
																cursor: "pointer",
																font: "inherit",
																fontSize: "11px",
																padding: 0
															},
															children: "编辑"
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															disabled: removing,
															onClick: () => {
																if (!confirming) {
																	setConfirmingPersonaId(persona.id);
																	return;
																}
																setRemovingPersonaId(persona.id);
																setError(void 0);
																deletePersona(persona.id).then(() => {
																	setPersonas((current) => (current ?? []).filter((entry) => entry.id !== persona.id));
																	setPersonaId("");
																	setConfirmingPersonaId(void 0);
																	setRemovingPersonaId(void 0);
																	if (personaEditorId === persona.id) {
																		setEditingPersona(false);
																		setPersonaEditorId(void 0);
																		setPersonaName("");
																		setPersonaDescription("");
																	}
																	setActionNotice(`已移除身份「${persona.name}」`);
																}, (removeError) => {
																	setRemovingPersonaId(void 0);
																	setError(removeError instanceof Error ? removeError.message : String(removeError));
																});
															},
															style: {
																background: "transparent",
																border: 0,
																color: confirming ? "#e88989" : "inherit",
																cursor: removing ? "wait" : "pointer",
																font: "inherit",
																fontSize: "11px",
																opacity: confirming ? 1 : .48,
																padding: 0
															},
															children: removing ? "正在移除…" : confirming ? "确认移除" : "移除"
														}),
														confirming && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															onClick: () => {
																setConfirmingPersonaId(void 0);
															},
															style: {
																background: "transparent",
																border: 0,
																color: "inherit",
																cursor: "pointer",
																font: "inherit",
																fontSize: "11px",
																opacity: .48,
																padding: 0
															},
															children: "取消"
														})
													]
												})]
											});
										})(),
										editingPersona && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
												borderRadius: "10px",
												display: "grid",
												gap: "9px",
												marginTop: "10px",
												padding: "11px"
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													value: personaName,
													maxLength: 120,
													placeholder: "称呼（角色会这样称呼你）",
													onChange: (event) => {
														setPersonaName(event.target.value);
													},
													style: {
														background: "transparent",
														border: "1px solid var(--dsw-alias-border-l2, #414147)",
														borderRadius: "8px",
														boxSizing: "border-box",
														color: "inherit",
														font: "inherit",
														padding: "8px 9px",
														width: "100%"
													}
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
													value: personaDescription,
													maxLength: 12e3,
													rows: 4,
													placeholder: "你的身份、外貌、性格或与角色的关系；留白也可以",
													onChange: (event) => {
														setPersonaDescription(event.target.value);
													},
													style: {
														background: "transparent",
														border: "1px solid var(--dsw-alias-border-l2, #414147)",
														borderRadius: "8px",
														boxSizing: "border-box",
														color: "inherit",
														font: "inherit",
														lineHeight: 1.55,
														padding: "8px 9px",
														resize: "vertical",
														width: "100%"
													}
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: savingPersona || personaName.trim() === "",
													onClick: () => {
														setSavingPersona(true);
														setError(void 0);
														const editingId = personaEditorId;
														savePersona({
															format: 0,
															...editingId === void 0 ? {} : { id: editingId },
															name: personaName,
															description: personaDescription
														}).then((entry) => {
															setPersonas((current) => [entry, ...(current ?? []).filter((item) => item.id !== entry.id)]);
															setPersonaId(entry.id);
															setEditingPersona(false);
															setPersonaEditorId(void 0);
															setSavingPersona(false);
															setActionNotice(`${editingId === void 0 ? "已保存并选中" : "已更新"}身份「${entry.name}」`);
														}, (saveError) => {
															setSavingPersona(false);
															setError(saveError instanceof Error ? saveError.message : String(saveError));
														});
													},
													style: {
														background: color,
														border: 0,
														borderRadius: "8px",
														color: "#fff",
														cursor: "pointer",
														font: "inherit",
														justifySelf: "end",
														opacity: personaName.trim() === "" ? .45 : 1,
														padding: "7px 11px"
													},
													children: savingPersona ? "正在保存…" : personaEditorId === void 0 ? "保存并选中" : "更新并选中"
												})
											]
										}),
										currentCharacterId !== void 0 && selected.id === currentCharacterId && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											style: {
												alignItems: "flex-start",
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
												borderRadius: "10px",
												cursor: "pointer",
												display: "flex",
												gap: "10px",
												marginTop: "18px",
												padding: "11px 12px"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: copyActiveMemory,
												onChange: (event) => {
													setCopyActiveMemory(event.target.checked);
												},
												style: {
													accentColor: color,
													margin: "2px 0 0"
												}
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													display: "block",
													fontSize: "12px",
													fontWeight: 620
												},
												children: "带上当前会话的有效记忆（如果有）"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													display: "block",
													fontSize: "11px",
													lineHeight: 1.5,
													marginTop: "4px",
													opacity: .5
												},
												children: "只复制角色仍记得的事，不复制聊天记录或修改过程"
											})] })]
										})
									] }),
									error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										role: "alert",
										style: {
											color: "#e88989",
											fontSize: "12px",
											lineHeight: 1.55,
											marginTop: "14px"
										},
										children: error
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
								style: {
									alignItems: "center",
									borderTop: "1px solid var(--dsw-alias-border-l2, #39393c)",
									display: "flex",
									gap: "10px",
									justifyContent: "flex-end",
									padding: "14px 20px"
								},
								children: [
									actionNotice !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										role: "status",
										style: {
											fontSize: "12px",
											marginRight: "auto",
											opacity: .62
										},
										children: actionNotice
									}),
									actionNotice === void 0 && collection === "archived" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: "12px",
											marginRight: "auto",
											opacity: .52
										},
										children: "移回角色库后即可开始新对话"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: onClose,
										style: {
											background: "transparent",
											border: "1px solid var(--dsw-alias-border-l2, #444)",
											borderRadius: "9px",
											color: "inherit",
											cursor: "pointer",
											font: "inherit",
											padding: "8px 13px"
										},
										children: "取消"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: collection === "archived" || selected === void 0 || starting || importingPreset,
										onClick: () => {
											if (selected === void 0) return;
											setStarting(true);
											setError(void 0);
											const persona = personas?.find((entry) => entry.id === personaId);
											onStart(selected, greetingIndex, persona === void 0 ? void 0 : {
												id: persona.id,
												name: persona.name,
												description: persona.description
											}, presetId === "" ? void 0 : presetId, copyActiveMemory ? "copy-active" : void 0).then(() => {
												setStarting(false);
												onClose();
											}, (startError) => {
												setStarting(false);
												setError(startError instanceof Error ? startError.message : String(startError));
											});
										},
										style: {
											background: color,
											border: 0,
											borderRadius: "9px",
											color: "#fff",
											cursor: starting ? "wait" : "pointer",
											font: "inherit",
											fontWeight: 620,
											opacity: collection === "archived" || selected === void 0 ? .45 : 1,
											padding: "8px 15px"
										},
										children: starting ? "正在开始…" : "开始新对话"
									})
								]
							})
						]
					})]
				})
			});
		}
		function roleLabel(role) {
			switch (role) {
				case "system": return "系统";
				case "user": return "用户";
				case "assistant": return "助手";
			}
		}
		function PresetManagerDialog({ sessionId, preset, lastRequest, promptRegex, entries, loadModelCapabilities, onClose, onImport, onSave, onLibrary }) {
			const [prompts, setPrompts] = (0, react.useState)(() => preset.prompts.map((prompt) => ({ ...prompt })));
			const [regexScripts, setRegexScripts] = (0, react.useState)(() => preset.regexScripts.map((script) => ({ ...script })));
			const [temperature, setTemperature] = (0, react.useState)(preset.generation.temperature?.toString() ?? "");
			const [maxTokens, setMaxTokens] = (0, react.useState)(preset.generation.maxTokens?.toString() ?? "");
			const [reasoningEffort, setReasoningEffort] = (0, react.useState)(preset.generation.reasoningEffort ?? "");
			const [query, setQuery] = (0, react.useState)("");
			const [section, setSection] = (0, react.useState)("prompts");
			const [collapsedPromptSections, setCollapsedPromptSections] = (0, react.useState)(() => new Set(projectPresetPromptSections(preset.prompts).slice(1).map((group) => group.key)));
			const [editingPromptId, setEditingPromptId] = (0, react.useState)();
			const [promptFilter, setPromptFilter] = (0, react.useState)("all");
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const [libraryOpen, setLibraryOpen] = (0, react.useState)(false);
			const [inspectionOpen, setInspectionOpen] = (0, react.useState)(false);
			const [modelCapabilities, setModelCapabilities] = (0, react.useState)({ status: "loading" });
			const importInputRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				let cancelled = false;
				loadModelCapabilities(sessionId).then((value) => {
					if (!cancelled) setModelCapabilities({
						status: "ready",
						value
					});
				}, (reason) => {
					if (!cancelled) setModelCapabilities({
						status: "error",
						error: reason instanceof Error ? reason.message : String(reason)
					});
				});
				return () => {
					cancelled = true;
				};
			}, [loadModelCapabilities, sessionId]);
			const normalizedQuery = query.trim().toLocaleLowerCase();
			const attachedPositionById = new Map(prompts.filter((prompt) => prompt.attached).map((prompt, position) => [prompt.identifier, position]));
			const promptModified = (prompt) => !prompt.imported || prompt.name !== prompt.importedName || prompt.role !== prompt.importedRole || prompt.content !== prompt.importedContent || prompt.injectionPosition !== prompt.importedInjectionPosition || prompt.injectionDepth !== prompt.importedInjectionDepth || prompt.injectionOrder !== prompt.importedInjectionOrder || prompt.attached !== prompt.importedAttached || prompt.attached && prompt.enabled !== prompt.importedEnabled || prompt.attached && attachedPositionById.get(prompt.identifier) !== prompt.importedPosition;
			const visiblePromptSections = projectPresetPromptSections(prompts).flatMap((group) => {
				const filteredPrompts = group.prompts.filter((prompt) => promptFilter === "all" || promptFilter === "enabled" && prompt.enabled || promptFilter === "modified" && promptModified(prompt));
				const matchingPrompts = normalizedQuery === "" || group.title.toLocaleLowerCase().includes(normalizedQuery) ? filteredPrompts : filteredPrompts.filter((prompt) => prompt.name.toLocaleLowerCase().includes(normalizedQuery) || prompt.identifier.toLocaleLowerCase().includes(normalizedQuery));
				return matchingPrompts.length === 0 ? [] : [{
					...group,
					prompts: matchingPrompts,
					enabledCount: matchingPrompts.filter((prompt) => prompt.enabled).length
				}];
			});
			const visibleRegex = regexScripts.filter((script) => normalizedQuery === "" || script.scriptName.toLocaleLowerCase().includes(normalizedQuery));
			const promptRegexByIndex = new Map(promptRegex?.scripts.filter((script) => script.source === "preset").map((script) => [script.index, script]));
			const attached = prompts.filter((prompt) => prompt.attached);
			const enabledCount = attached.filter((prompt) => prompt.enabled).length;
			const editingPrompt = prompts.find((prompt) => prompt.identifier === editingPromptId);
			const reasoning = modelCapabilities.value?.reasoning;
			const selectedReasoning = reasoning?.efforts.find((effort) => effort.id === reasoningEffort);
			const unsupportedReasoning = reasoningEffort !== "" && reasoningEffort !== "auto" && modelCapabilities.status === "ready" && reasoning !== void 0 && selectedReasoning === void 0;
			const selectedReasoningLabel = selectedReasoning?.name ?? (reasoningEffort === "" ? "" : reasoningEffort.charAt(0).toLocaleUpperCase() + reasoningEffort.slice(1));
			const currentReasoningLabel = modelCapabilities.value?.current.reasoningEffort === void 0 ? "模型默认等级" : reasoning?.efforts.find((effort) => effort.id === modelCapabilities.value?.current.reasoningEffort)?.name ?? modelCapabilities.value.current.reasoningEffort;
			const modelLabel = modelCapabilities.value === void 0 ? void 0 : modelCapabilities.value.modelName ?? modelCapabilities.value.current.model;
			const preservedSampling = preset.preservedGeneration.filter((value) => !value.startsWith("reasoning_effort"));
			const togglePromptSection = (key) => {
				setCollapsedPromptSections((current) => {
					const next = new Set(current);
					if (next.has(key)) next.delete(key);
					else next.add(key);
					return next;
				});
			};
			const setPrompt = (identifier, update) => {
				setPrompts((current) => current.map((prompt) => prompt.identifier === identifier ? update(prompt) : prompt));
			};
			const setPromptContent = (identifier, content) => {
				setPrompt(identifier, (prompt) => ({
					...prompt,
					content,
					contentModified: content !== prompt.importedContent
				}));
			};
			const addPrompt = () => {
				const identifier = crypto.randomUUID();
				const prompt = {
					identifier,
					name: "新提示模块",
					importedName: "新提示模块",
					role: "system",
					importedRole: "system",
					content: "",
					importedContent: "",
					imported: false,
					contentModified: false,
					injectionPosition: 0,
					injectionDepth: 4,
					injectionOrder: 100,
					marker: false,
					systemPrompt: false,
					forbidOverrides: false,
					attached: true,
					importedAttached: false,
					enabled: false,
					importedEnabled: false,
					toggleable: true,
					editable: true,
					deletable: true
				};
				setPrompts((current) => [
					...current.filter((item) => item.attached),
					prompt,
					...current.filter((item) => !item.attached)
				]);
				setEditingPromptId(identifier);
			};
			const exportCopy = () => {
				const resolvedTemperature = temperature.trim() === "" ? void 0 : Number(temperature);
				const resolvedMaxTokens = maxTokens.trim() === "" ? void 0 : Number(maxTokens);
				if (resolvedTemperature !== void 0 && (!Number.isFinite(resolvedTemperature) || resolvedTemperature < 0 || resolvedTemperature > 2)) {
					setError("温度需填写 0 到 2 之间的数字");
					return;
				}
				if (resolvedMaxTokens !== void 0 && (!Number.isSafeInteger(resolvedMaxTokens) || resolvedMaxTokens < 1)) {
					setError("最大输出需填写正整数");
					return;
				}
				setError(void 0);
				const exportJson = exportSillyTavernPresetJson({
					prompts: prompts.map((prompt) => ({
						identifier: prompt.identifier,
						name: prompt.name,
						role: prompt.role,
						content: prompt.content,
						marker: prompt.marker,
						systemPrompt: prompt.systemPrompt,
						forbidOverrides: prompt.forbidOverrides,
						...prompt.injectionPosition === void 0 ? {} : { injectionPosition: prompt.injectionPosition },
						...prompt.injectionDepth === void 0 ? {} : { injectionDepth: prompt.injectionDepth },
						...prompt.injectionOrder === void 0 ? {} : { injectionOrder: prompt.injectionOrder }
					})),
					order: prompts.filter((prompt) => prompt.attached).map((prompt) => ({
						identifier: prompt.identifier,
						enabled: prompt.enabled
					})),
					generation: {
						...preset.generation.topP === void 0 ? {} : { topP: preset.generation.topP },
						...preset.generation.topK === void 0 ? {} : { topK: preset.generation.topK },
						...preset.generation.topA === void 0 ? {} : { topA: preset.generation.topA },
						...preset.generation.minP === void 0 ? {} : { minP: preset.generation.minP },
						...preset.generation.frequencyPenalty === void 0 ? {} : { frequencyPenalty: preset.generation.frequencyPenalty },
						...preset.generation.presencePenalty === void 0 ? {} : { presencePenalty: preset.generation.presencePenalty },
						...preset.generation.repetitionPenalty === void 0 ? {} : { repetitionPenalty: preset.generation.repetitionPenalty },
						...resolvedTemperature === void 0 ? {} : { temperature: resolvedTemperature },
						...resolvedMaxTokens === void 0 ? {} : { maxTokens: resolvedMaxTokens },
						...reasoningEffort === "" ? {} : { reasoningEffort }
					},
					formats: preset.formats,
					regexScripts: regexScripts.map(({ index: _index, ...script }) => script)
				});
				const blob = new Blob([exportJson], { type: "application/json;charset=utf-8" });
				const url = URL.createObjectURL(blob);
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.download = `${preset.name.replace(/[\\/:*?"<>|]+/gu, "_")} · Agent RP 副本.json`;
				anchor.click();
				anchor.remove();
				setTimeout(() => {
					URL.revokeObjectURL(url);
				}, 0);
			};
			const move = (identifier, direction) => {
				setPrompts((current) => {
					const attachedPrompts = current.filter((prompt) => prompt.attached);
					const detachedPrompts = current.filter((prompt) => !prompt.attached);
					const index = attachedPrompts.findIndex((prompt) => prompt.identifier === identifier);
					const destination = index + direction;
					if (index < 0 || destination < 0 || destination >= attachedPrompts.length) return current;
					const next = [...attachedPrompts];
					const [entry] = next.splice(index, 1);
					if (entry === void 0) return current;
					next.splice(destination, 0, entry);
					return [...next, ...detachedPrompts];
				});
			};
			const save = async (close = true) => {
				const resolvedTemperature = temperature.trim() === "" ? null : Number(temperature);
				const resolvedMaxTokens = maxTokens.trim() === "" ? null : Number(maxTokens);
				if (resolvedTemperature !== null && (!Number.isFinite(resolvedTemperature) || resolvedTemperature < 0 || resolvedTemperature > 2)) {
					setError("温度需填写 0 到 2 之间的数字");
					return false;
				}
				if (resolvedMaxTokens !== null && (!Number.isSafeInteger(resolvedMaxTokens) || resolvedMaxTokens < 1)) {
					setError("最大输出需填写正整数");
					return false;
				}
				setSaving(true);
				setError(void 0);
				try {
					await onSave({
						operation: "replace",
						revision: preset.revision,
						order: prompts.filter((prompt) => prompt.attached).map((prompt) => ({
							identifier: prompt.identifier,
							enabled: prompt.enabled
						})),
						prompts: prompts.map((prompt) => ({
							identifier: prompt.identifier,
							name: prompt.name,
							role: prompt.role,
							content: prompt.content,
							...prompt.injectionPosition === void 0 ? {} : { injectionPosition: prompt.injectionPosition },
							...prompt.injectionDepth === void 0 ? {} : { injectionDepth: prompt.injectionDepth },
							...prompt.injectionOrder === void 0 ? {} : { injectionOrder: prompt.injectionOrder }
						})),
						content: [],
						generation: {
							temperature: resolvedTemperature,
							maxTokens: resolvedMaxTokens,
							reasoningEffort: reasoningEffort === "" ? null : reasoningEffort
						},
						regex: regexScripts.map((script) => ({
							index: script.index,
							disabled: script.disabled
						}))
					});
					if (close) onClose();
					return true;
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : "预设保存失败");
					return false;
				} finally {
					setSaving(false);
				}
			};
			const reset = async () => {
				setSaving(true);
				setError(void 0);
				try {
					await onSave({
						operation: "reset",
						revision: preset.revision
					});
					onClose();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : "恢复预设默认值失败");
				} finally {
					setSaving(false);
				}
			};
			const saveToLibrary = async () => {
				const name = window.prompt("新预设名称", `${preset.name} · 副本`)?.trim();
				if (name === void 0 || name === "") return;
				if (!await save(false)) return;
				setSaving(true);
				try {
					await onLibrary({
						operation: "save",
						name
					});
					onClose();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : "另存预设失败");
				} finally {
					setSaving(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "agent-rp-preset-overlay",
				role: "dialog",
				"aria-modal": "true",
				"aria-label": `${preset.name}预设管理`,
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.62)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1100
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget && !saving) onClose();
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: presetManagerResponsiveStyle }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "agent-rp-preset-dialog",
						style: {
							background: "var(--dsw-alias-bg-base, #151518)",
							border: "1px solid var(--dsw-alias-border-l2, #38383d)",
							borderRadius: "16px",
							boxShadow: "0 24px 80px rgba(0,0,0,.45)",
							display: "flex",
							flexDirection: "column",
							maxHeight: "min(900px, 92vh)",
							maxWidth: "920px",
							overflow: "hidden",
							width: "min(96vw, 920px)"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								style: {
									alignItems: "center",
									borderBottom: "1px solid var(--dsw-alias-border-l2, #343438)",
									display: "flex",
									gap: "12px",
									padding: "18px 20px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { minWidth: 0 },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
										style: {
											fontSize: "17px",
											margin: 0,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: preset.name
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: "12px",
											marginTop: "4px",
											opacity: .56
										},
										children: [
											enabledCount,
											" 项提示启用 · ",
											regexScripts.filter((script) => !script.disabled).length,
											"/",
											regexScripts.length,
											" 条正则启用 · 会话独立"
										]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "关闭预设管理",
									disabled: saving,
									onClick: onClose,
									style: {
										background: "transparent",
										border: 0,
										color: "inherit",
										cursor: "pointer",
										fontSize: "22px",
										marginLeft: "auto",
										padding: "4px"
									},
									children: "×"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "agent-rp-preset-body",
								style: {
									display: "grid",
									flex: "1 1 auto",
									gap: "14px",
									gridTemplateColumns: "minmax(0, 1fr) 230px",
									minHeight: 0,
									padding: "16px 20px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "agent-rp-preset-list",
									style: {
										display: "flex",
										flexDirection: "column",
										minHeight: 0
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												display: "flex",
												gap: "6px",
												marginBottom: "9px"
											},
											children: [["prompts", "提示模块"], ["regex", "正则脚本"]].map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => {
													setSection(value);
													setQuery("");
												},
												style: {
													...miniButtonStyle,
													background: section === value ? `color-mix(in srgb, ${color} 16%, transparent)` : "transparent",
													borderColor: section === value ? `color-mix(in srgb, ${color} 42%, transparent)` : miniButtonStyle.border,
													height: "30px",
													padding: "3px 10px"
												},
												children: [label, value === "regex" ? ` · ${regexScripts.length}` : ""]
											}, value))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											"aria-label": section === "prompts" ? "搜索提示模块" : "搜索正则脚本",
											placeholder: section === "prompts" ? "搜索模块名称或标识…" : "搜索正则脚本名称…",
											value: query,
											onChange: (event) => {
												setQuery(event.target.value);
											},
											style: {
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
												borderRadius: "9px",
												color: "inherit",
												font: "inherit",
												fontSize: "13px",
												outline: "none",
												padding: "9px 11px"
											}
										}),
										section === "prompts" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: "5px",
												marginTop: "8px"
											},
											children: [[
												["all", "全部"],
												["enabled", "已启用"],
												["modified", "已修改"]
											].map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => {
													setPromptFilter(value);
												},
												style: {
													...miniButtonStyle,
													background: promptFilter === value ? `color-mix(in srgb, ${color} 14%, transparent)` : "transparent",
													borderColor: promptFilter === value ? `color-mix(in srgb, ${color} 38%, transparent)` : miniButtonStyle.border
												},
												children: label
											}, value)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: addPrompt,
												style: {
													...miniButtonStyle,
													marginLeft: "auto"
												},
												children: "＋ 新建模块"
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												fontSize: "11px",
												justifyContent: "space-between",
												margin: "10px 3px 7px",
												opacity: .48
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: section === "prompts" ? "提示模块" : "预设正则" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: section === "prompts" ? "顺序与开关" : "开关" })]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												flexDirection: "column",
												gap: "6px",
												minHeight: "220px",
												overflowY: "auto",
												paddingRight: "4px"
											},
											children: [
												section === "prompts" && visiblePromptSections.map((group) => {
													const collapsed = normalizedQuery === "" && collapsedPromptSections.has(group.key);
													return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
														style: {
															display: "flex",
															flexDirection: "column",
															gap: "6px"
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															"aria-expanded": !collapsed,
															onClick: () => {
																togglePromptSection(group.key);
															},
															style: {
																alignItems: "center",
																background: "var(--dsw-alias-bg-layer-1, #202024)",
																border: "1px solid var(--dsw-alias-border-l2, #34343a)",
																borderRadius: "10px",
																color: "inherit",
																cursor: "pointer",
																display: "grid",
																font: "inherit",
																gap: "8px",
																gridTemplateColumns: "18px minmax(0, 1fr) auto",
																minHeight: "42px",
																padding: "8px 11px",
																textAlign: "left",
																width: "100%"
															},
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	"aria-hidden": "true",
																	style: {
																		fontSize: "12px",
																		opacity: .58,
																		transform: `rotate(${collapsed ? 0 : 90}deg)`,
																		transition: "transform .14s ease"
																	},
																	children: "›"
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	style: {
																		fontSize: "13px",
																		fontWeight: 620,
																		overflow: "hidden",
																		textOverflow: "ellipsis",
																		whiteSpace: "nowrap"
																	},
																	children: group.title
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	style: {
																		fontSize: "10px",
																		opacity: .46
																	},
																	children: [
																		group.enabledCount,
																		"/",
																		group.prompts.length,
																		" 启用"
																	]
																})
															]
														}), !collapsed && group.prompts.map((prompt) => {
															const attachedIndex = prompts.filter((item) => item.attached).findIndex((item) => item.identifier === prompt.identifier);
															return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																style: {
																	alignItems: "center",
																	background: prompt.enabled ? `color-mix(in srgb, ${color} 9%, transparent)` : "var(--dsw-alias-bg-layer-1, #202024)",
																	border: `1px solid ${prompt.enabled ? `color-mix(in srgb, ${color} 24%, transparent)` : "var(--dsw-alias-border-l2, #34343a)"}`,
																	borderRadius: "10px",
																	display: "grid",
																	gap: "8px",
																	gridTemplateColumns: "minmax(0, 1fr) auto",
																	marginLeft: "8px",
																	minHeight: "52px",
																	padding: "8px 9px 8px 12px",
																	opacity: prompt.attached ? 1 : .62
																},
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	style: { minWidth: 0 },
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																		style: {
																			alignItems: "center",
																			display: "flex",
																			gap: "7px",
																			minWidth: 0
																		},
																		children: [
																			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																				style: {
																					fontSize: "13px",
																					fontWeight: 560,
																					overflow: "hidden",
																					textOverflow: "ellipsis",
																					whiteSpace: "nowrap"
																				},
																				children: prompt.name || prompt.identifier
																			}),
																			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																				style: {
																					fontSize: "10px",
																					opacity: .48
																				},
																				children: prompt.marker ? "结构位" : roleLabel(prompt.role)
																			}),
																			promptModified(prompt) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																				style: {
																					color,
																					fontSize: "10px",
																					opacity: .82
																				},
																				children: "已修改"
																			})
																		]
																	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																		title: prompt.identifier,
																		style: {
																			fontFamily: "ui-monospace, monospace",
																			fontSize: "10px",
																			marginTop: "3px",
																			opacity: .38,
																			overflow: "hidden",
																			textOverflow: "ellipsis",
																			whiteSpace: "nowrap"
																		},
																		children: prompt.identifier
																	})]
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	style: {
																		alignItems: "center",
																		display: "flex",
																		gap: "5px"
																	},
																	children: [
																		prompt.editable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			onClick: () => {
																				setEditingPromptId(prompt.identifier);
																			},
																			style: miniButtonStyle,
																			children: "编辑"
																		}),
																		prompt.imported && prompt.editable && prompt.content !== prompt.importedContent && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			onClick: () => {
																				setPromptContent(prompt.identifier, prompt.importedContent);
																			},
																			style: miniButtonStyle,
																			children: "恢复默认正文"
																		}),
																		prompt.attached && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			"aria-label": `上移${prompt.name}`,
																			disabled: attachedIndex <= 0 || normalizedQuery !== "",
																			onClick: () => {
																				move(prompt.identifier, -1);
																			},
																			style: miniButtonStyle,
																			children: "↑"
																		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			"aria-label": `下移${prompt.name}`,
																			disabled: attachedIndex >= attached.length - 1 || normalizedQuery !== "",
																			onClick: () => {
																				move(prompt.identifier, 1);
																			},
																			style: miniButtonStyle,
																			children: "↓"
																		})] }),
																		prompt.toggleable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			role: "switch",
																			"aria-checked": prompt.enabled,
																			onClick: () => {
																				setPrompt(prompt.identifier, (value) => ({
																					...value,
																					attached: true,
																					enabled: !value.enabled
																				}));
																			},
																			style: {
																				background: prompt.enabled ? color : "var(--dsw-alias-bg-layer-2, #2b2b30)",
																				border: 0,
																				borderRadius: "999px",
																				cursor: "pointer",
																				height: "22px",
																				padding: "2px",
																				position: "relative",
																				width: "39px"
																			},
																			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
																				background: "#fff",
																				borderRadius: "50%",
																				display: "block",
																				height: "18px",
																				transform: `translateX(${prompt.enabled ? 17 : 0}px)`,
																				transition: "transform .14s ease",
																				width: "18px"
																			} })
																		}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			style: {
																				fontSize: "10px",
																				opacity: .44,
																				padding: "0 3px"
																			},
																			children: "固定"
																		}),
																		!prompt.attached && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			onClick: () => {
																				setPrompt(prompt.identifier, (value) => ({
																					...value,
																					attached: true
																				}));
																			},
																			style: miniButtonStyle,
																			children: "加入"
																		})
																	]
																})]
															}, prompt.identifier);
														})]
													}, group.key);
												}),
												section === "regex" && promptRegex !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													role: "status",
													style: {
														background: `color-mix(in srgb, ${color} 7%, transparent)`,
														border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
														borderRadius: "10px",
														fontSize: "11px",
														lineHeight: 1.55,
														padding: "9px 11px"
													},
													children: [
														"上次生成检查了 ",
														promptRegex.messageCount,
														" 条对话，更新模型视图 ",
														promptRegex.replacementCount,
														" 条。这里只记录脚本名和结果"
													]
												}),
												section === "regex" && visibleRegex.map((script) => {
													const trace = promptRegexByIndex.get(script.index);
													const traceLabel = script.markdownOnly && !script.promptOnly ? "仅用于显示" : trace === void 0 ? void 0 : trace.outcome === "applied" ? `上次命中 ${trace.affectedMessages} 条` : trace.outcome === "no-match" ? "上次未命中" : trace.outcome === "disabled" ? "上次未启用" : trace.outcome === "display-only" ? "仅用于显示" : trace.outcome === "placement" ? "消息位置不匹配" : trace.outcome === "depth" ? "消息深度不匹配" : "表达式无效";
													return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														style: {
															alignItems: "center",
															background: !script.disabled ? `color-mix(in srgb, ${color} 9%, transparent)` : "var(--dsw-alias-bg-layer-1, #202024)",
															border: `1px solid ${!script.disabled ? `color-mix(in srgb, ${color} 24%, transparent)` : "var(--dsw-alias-border-l2, #34343a)"}`,
															borderRadius: "10px",
															display: "grid",
															gap: "8px",
															gridTemplateColumns: "minmax(0, 1fr) auto",
															minHeight: "52px",
															padding: "8px 9px 8px 12px"
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															style: { minWidth: 0 },
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																	style: {
																		fontSize: "13px",
																		fontWeight: 560,
																		overflow: "hidden",
																		textOverflow: "ellipsis",
																		whiteSpace: "nowrap"
																	},
																	children: script.scriptName
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																	style: {
																		fontSize: "10px",
																		marginTop: "3px",
																		opacity: .42
																	},
																	children: [
																		script.markdownOnly ? "显示" : void 0,
																		script.promptOnly ? "生成时执行" : void 0,
																		script.placement.includes(1) ? "用户消息" : void 0,
																		script.placement.includes(2) ? "角色回复" : void 0
																	].filter(Boolean).join(" · ") || "普通处理"
																}),
																traceLabel !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																	style: {
																		color: trace?.outcome === "invalid" ? "#d9a85f" : "inherit",
																		fontSize: "10px",
																		marginTop: "3px",
																		opacity: .58
																	},
																	children: traceLabel
																})
															]
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															role: "switch",
															"aria-checked": !script.disabled,
															disabled: saving,
															onClick: () => {
																setRegexScripts((current) => current.map((item) => item.index === script.index ? {
																	...item,
																	disabled: !item.disabled
																} : item));
															},
															style: {
																background: !script.disabled ? color : "var(--dsw-alias-bg-layer-2, #2b2b30)",
																border: 0,
																borderRadius: "999px",
																cursor: "pointer",
																height: "22px",
																padding: "2px",
																position: "relative",
																width: "39px"
															},
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
																background: "#fff",
																borderRadius: "50%",
																display: "block",
																height: "18px",
																transform: `translateX(${!script.disabled ? 17 : 0}px)`,
																transition: "transform .14s ease",
																width: "18px"
															} })
														})]
													}, script.index);
												}),
												(section === "prompts" && visiblePromptSections.length === 0 || section === "regex" && visibleRegex.length === 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													style: {
														fontSize: "13px",
														opacity: .52,
														padding: "32px 10px",
														textAlign: "center"
													},
													children: ["没有匹配的", section === "prompts" ? "模块" : "正则脚本"]
												})
											]
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
									className: "agent-rp-preset-generation",
									style: {
										borderLeft: "1px solid var(--dsw-alias-border-l2, #343438)",
										paddingLeft: "16px"
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
											style: {
												fontSize: "12px",
												fontWeight: 600,
												margin: "2px 0 13px",
												opacity: .62
											},
											children: "生成参数"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetNumberField, {
											label: "温度",
											hint: "0—2",
											value: temperature,
											onChange: setTemperature
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetNumberField, {
											label: "最大输出",
											hint: "由模型上限约束",
											value: maxTokens,
											onChange: setMaxTokens
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											style: fieldLabelStyle,
											children: ["推理等级", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
												value: reasoningEffort,
												onChange: (event) => {
													setReasoningEffort(event.target.value);
												},
												style: fieldInputStyle,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "",
														children: "跟随会话"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: "auto",
														children: "自动（跟随模型）"
													}),
													reasoning?.efforts.map((effort) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
														value: effort.id,
														children: effort.name
													}, effort.id)),
													reasoningEffort !== "" && reasoningEffort !== "auto" && selectedReasoning === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
														value: reasoningEffort,
														children: ["导入值 · ", selectedReasoningLabel]
													})
												]
											})]
										}),
										modelCapabilities.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											role: "status",
											style: {
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "-3px 1px 12px",
												opacity: .52
											},
											children: "正在读取当前模型可用等级…"
										}),
										modelCapabilities.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											role: "note",
											style: {
												color: "#d9a85f",
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "-3px 1px 12px"
											},
											children: "暂时无法读取当前模型能力，已保留原预设值"
										}),
										unsupportedReasoning && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											role: "note",
											style: {
												background: "rgba(217,168,95,.1)",
												border: "1px solid rgba(217,168,95,.28)",
												borderRadius: "9px",
												color: "#e3b66f",
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "-3px 1px 12px",
												padding: "8px 9px"
											},
											children: [
												selectedReasoningLabel,
												" 仍会保留在预设中；",
												modelLabel,
												" 不支持这个等级，下次回复将沿用会话等级 ",
												currentReasoningLabel
											]
										}),
										!unsupportedReasoning && modelCapabilities.status === "ready" && reasoning !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
											style: {
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "-3px 1px 12px",
												opacity: .52
											},
											children: [
												modelLabel,
												" 可用：",
												reasoning.efforts.length === 0 ? "没有可选推理等级" : reasoning.efforts.map((effort) => effort.name).join("、")
											]
										}),
										preservedSampling.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
											role: "note",
											style: {
												fontSize: "10px",
												lineHeight: 1.5,
												margin: "10px 1px 0",
												opacity: .5
											},
											children: [
												"暂未映射：",
												preservedSampling.join("、"),
												"；导出副本时仍会保留"
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											style: {
												fontSize: "11px",
												lineHeight: 1.55,
												margin: "16px 1px 0",
												opacity: .46
											},
											children: "修改只影响当前角色会话。未填写的参数跟随会话与模型设置"
										}),
										preset.extensionStatus.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												display: "flex",
												flexDirection: "column",
												gap: "5px",
												margin: "12px 1px 0"
											},
											children: preset.extensionStatus.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: {
													fontSize: "10px",
													lineHeight: 1.45,
													opacity: item.state === "unsupported" ? .72 : .44
												},
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														style: { color: item.state === "unsupported" ? "#d9a85f" : item.state === "active" ? "#7ec89b" : "inherit" },
														children: "●"
													}),
													" ",
													item.name,
													" · ",
													item.detail
												]
											}, item.name))
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
								className: "agent-rp-preset-footer",
								style: {
									alignItems: "center",
									borderTop: "1px solid var(--dsw-alias-border-l2, #343438)",
									display: "flex",
									gap: "9px",
									justifyContent: "flex-end",
									minHeight: "64px",
									padding: "12px 20px"
								},
								children: [
									error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										role: "alert",
										style: {
											color: "#e47a7a",
											fontSize: "12px",
											marginRight: "auto"
										},
										children: error
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: () => {
											reset();
										},
										style: {
											...secondaryButtonStyle,
											marginRight: error === void 0 ? "auto" : void 0
										},
										children: "恢复预设默认值"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										ref: importInputRef,
										type: "file",
										accept: ".json,application/json",
										hidden: true,
										onChange: (event) => {
											const file = event.currentTarget.files?.[0];
											event.currentTarget.value = "";
											if (file === void 0) return;
											setSaving(true);
											setError(void 0);
											onImport(file).then(onClose, (reason) => {
												setError(reason instanceof Error ? reason.message : "预设导入失败");
												setSaving(false);
											});
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: () => {
											importInputRef.current?.click();
										},
										style: secondaryButtonStyle,
										children: "替换预设"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: () => {
											setLibraryOpen(true);
											onLibrary({ operation: "list" });
										},
										style: secondaryButtonStyle,
										children: "预设库"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: () => {
											setInspectionOpen(true);
										},
										style: secondaryButtonStyle,
										children: "运行检查"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: exportCopy,
										title: preset.omittedExtensions.length === 0 ? "导出当前配置" : `不包含未执行扩展：${preset.omittedExtensions.join("、")}`,
										style: secondaryButtonStyle,
										children: "导出副本"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: () => {
											saveToLibrary();
										},
										style: secondaryButtonStyle,
										children: "另存为预设"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: onClose,
										style: secondaryButtonStyle,
										children: "取消"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: saving,
										onClick: () => {
											save();
										},
										style: primaryButtonStyle,
										children: saving ? "保存中…" : "保存到此会话"
									})
								]
							})
						]
					}),
					editingPrompt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetPromptEditorDialog, {
						prompt: editingPrompt,
						onClose: () => {
							setEditingPromptId(void 0);
						},
						onApply: (value) => {
							setPrompt(editingPrompt.identifier, (prompt) => ({
								...prompt,
								name: value.name,
								role: value.role,
								content: value.content,
								injectionPosition: value.injectionPosition,
								injectionDepth: value.injectionDepth,
								injectionOrder: value.injectionOrder,
								contentModified: value.content !== prompt.importedContent
							}));
							setEditingPromptId(void 0);
						},
						...editingPrompt.deletable ? { onDelete: () => {
							setPrompts((current) => current.filter((prompt) => prompt.identifier !== editingPrompt.identifier));
							setEditingPromptId(void 0);
						} } : {}
					}),
					libraryOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetLibraryDialog, {
						entries,
						...preset.libraryId === void 0 ? {} : { activeId: preset.libraryId },
						onClose: () => {
							setLibraryOpen(false);
						},
						onAction: async (request) => {
							await onLibrary(request);
							if (request.operation === "select") onClose();
						}
					}),
					inspectionOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetRuntimeInspector, {
						preset,
						lastRequest,
						onClose: () => {
							setInspectionOpen(false);
						}
					})
				]
			});
		}
		function requestParameterSummary(request) {
			const config = request.config;
			return [
				`${config.provider} / ${config.model}`,
				config.reasoningEffort === void 0 ? void 0 : `推理 ${config.reasoningEffort}`,
				config.temperature === void 0 ? void 0 : `温度 ${config.temperature}`,
				config.maxTokens === void 0 ? void 0 : `最大输出 ${config.maxTokens}`,
				config.stop === void 0 || config.stop.length === 0 ? void 0 : `${config.stop.length} 个停止词`,
				request.toolNames.length === 0 ? "未提供工具" : `${request.toolNames.length} 个工具`
			].filter((value) => value !== void 0);
		}
		function requestedReasoningDifference(preset, request, requestMatches) {
			const requested = preset.generation.reasoningEffort;
			const actual = request.config.reasoningEffort;
			if (!requestMatches || requested === void 0 || requested === "auto" || actual === void 0 || requested === actual) return void 0;
			return `推理等级不同：预设保存的是 ${requested}，这次实际请求使用 ${actual}。当前模型没有采用预设值`;
		}
		function PresetRuntimeInspector({ preset, lastRequest, onClose }) {
			const enabled = preset.prompts.filter((prompt) => prompt.attached && prompt.enabled);
			const historyIndex = enabled.findIndex((prompt) => prompt.identifier === "chatHistory" && prompt.marker);
			const requestMatches = lastRequest !== void 0 && lastRequest.presetName === preset.name && lastRequest.presetRevision === preset.revision;
			const reasoningDifference = lastRequest === void 0 ? void 0 : requestedReasoningDifference(preset, lastRequest, requestMatches);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-dialog": true,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "预设运行检查",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.7)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1250
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #151518)",
						border: "1px solid var(--dsw-alias-border-l2, #38383d)",
						borderRadius: "16px",
						boxShadow: "0 26px 90px rgba(0,0,0,.5)",
						display: "flex",
						flexDirection: "column",
						maxHeight: "92vh",
						maxWidth: "1100px",
						overflow: "hidden",
						width: "min(96vw, 1100px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								alignItems: "center",
								borderBottom: "1px solid var(--dsw-alias-border-l2, #343438)",
								display: "flex",
								gap: "12px",
								padding: "18px 20px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { minWidth: 0 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: {
										fontSize: "17px",
										margin: 0
									},
									children: "运行检查"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "12px",
										lineHeight: 1.5,
										marginTop: "4px",
										opacity: .56
									},
									children: "已保存的预设顺序与 Host 最近记录的实际系统提示"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "关闭运行检查",
								onClick: onClose,
								style: {
									background: "transparent",
									border: 0,
									color: "inherit",
									cursor: "pointer",
									fontSize: "22px",
									marginLeft: "auto",
									padding: "4px"
								},
								children: "×"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								borderBottom: "1px solid var(--dsw-alias-border-l2, #343438)",
								padding: "13px 20px"
							},
							children: lastRequest === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								role: "status",
								style: {
									background: "var(--dsw-alias-bg-layer-1, #202024)",
									borderRadius: "9px",
									fontSize: "12px",
									lineHeight: 1.6,
									padding: "10px 12px"
								},
								children: "这段会话还没有真实模型请求。发送一条消息后，这里才会出现实际系统提示和最终参数"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									role: "status",
									style: {
										color: requestMatches ? "inherit" : "#d9a85f",
										fontSize: "12px",
										lineHeight: 1.5
									},
									children: requestMatches ? `当前预设版本与最近记录的请求一致 · ${new Date(lastRequest.time).toLocaleString()}` : `当前预设在最近记录的请求之后发生过变化 · 右侧仍显示当时实际使用的内容`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										display: "flex",
										flexWrap: "wrap",
										gap: "6px",
										marginTop: "9px"
									},
									children: requestParameterSummary(lastRequest).map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: chipStyle,
										children: value
									}, value))
								}),
								reasoningDifference !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									role: "note",
									style: {
										background: "rgba(217,168,95,.1)",
										border: "1px solid rgba(217,168,95,.28)",
										borderRadius: "9px",
										color: "#e3b66f",
										fontSize: "11px",
										lineHeight: 1.55,
										marginTop: "10px",
										padding: "8px 10px"
									},
									children: reasoningDifference
								})
							] })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "agent-rp-runtime-inspector-body",
							style: {
								display: "grid",
								flex: "1 1 auto",
								gridTemplateColumns: "minmax(280px, .78fr) minmax(360px, 1.22fr)",
								minHeight: 0,
								overflow: "hidden"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "agent-rp-runtime-inspector-order",
								style: {
									borderRight: "1px solid var(--dsw-alias-border-l2, #343438)",
									minHeight: 0,
									overflowY: "auto",
									padding: "17px 18px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										alignItems: "baseline",
										display: "flex",
										gap: "8px",
										marginBottom: "11px"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										style: {
											fontSize: "12px",
											margin: 0
										},
										children: "当前组装顺序"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											fontSize: "10px",
											opacity: .44
										},
										children: [enabled.length, " 项启用"]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										display: "flex",
										flexDirection: "column",
										gap: "6px"
									},
									children: enabled.map((prompt, index) => {
										const retained = prompt.injectionPosition === 1;
										const history = prompt.identifier === "chatHistory" && prompt.marker;
										const placement = retained ? "保留，当前不执行" : history ? "聊天记录位置" : historyIndex >= 0 && index > historyIndex ? "历史之后" : "系统提示";
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												alignItems: "center",
												background: "var(--dsw-alias-bg-layer-1, #202024)",
												border: "1px solid var(--dsw-alias-border-l2, #34343a)",
												borderRadius: "9px",
												display: "grid",
												gap: "9px",
												gridTemplateColumns: "25px minmax(0, 1fr) auto",
												padding: "8px 9px"
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: {
														fontFamily: "ui-monospace, monospace",
														fontSize: "10px",
														opacity: .38,
														textAlign: "right"
													},
													children: index + 1
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: { minWidth: 0 },
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														style: {
															display: "block",
															fontSize: "12px",
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap"
														},
														children: prompt.name || prompt.identifier
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														title: prompt.identifier,
														style: {
															display: "block",
															fontFamily: "ui-monospace, monospace",
															fontSize: "9px",
															marginTop: "2px",
															opacity: .34,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap"
														},
														children: prompt.identifier
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: {
														color: retained ? "#d9a85f" : "inherit",
														fontSize: "9px",
														opacity: retained ? .9 : .48,
														whiteSpace: "nowrap"
													},
													children: placement
												})
											]
										}, prompt.identifier);
									})
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								style: {
									display: "flex",
									flexDirection: "column",
									minHeight: 0,
									padding: "17px 18px"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											alignItems: "baseline",
											display: "flex",
											gap: "8px",
											marginBottom: "11px"
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
											style: {
												fontSize: "12px",
												margin: 0
											},
											children: "最近记录的实际系统提示"
										}), lastRequest !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												fontSize: "10px",
												opacity: .44
											},
											children: [lastRequest.system.length.toLocaleString(), " 字符"]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
										style: {
											background: "var(--dsw-alias-bg-layer-1, #202024)",
											border: "1px solid var(--dsw-alias-border-l2, #34343a)",
											borderRadius: "10px",
											flex: "1 1 auto",
											fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
											fontSize: "11px",
											lineHeight: 1.62,
											margin: 0,
											minHeight: "300px",
											overflow: "auto",
											padding: "13px",
											whiteSpace: "pre-wrap",
											wordBreak: "break-word"
										},
										children: lastRequest === void 0 ? "尚无真实请求" : lastRequest.system || "这一轮没有系统提示"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										style: {
											fontSize: "10px",
											lineHeight: 1.5,
											margin: "9px 1px 0",
											opacity: .42
										},
										children: "这里只展示 Host 写入会话记录的 system prompt；聊天历史与用户消息不会复制到检查页"
									})
								]
							})]
						})
					]
				})
			});
		}
		function PresetPromptEditorDialog({ prompt, onClose, onApply, onDelete }) {
			const [name, setName] = (0, react.useState)(prompt.name);
			const [role, setRole] = (0, react.useState)(prompt.role);
			const [content, setContent] = (0, react.useState)(prompt.content);
			const [injectionPosition, setInjectionPosition] = (0, react.useState)(prompt.injectionPosition ?? 0);
			const [injectionDepth, setInjectionDepth] = (0, react.useState)(String(prompt.injectionDepth ?? 4));
			const [injectionOrder, setInjectionOrder] = (0, react.useState)(String(prompt.injectionOrder ?? 100));
			const [confirmingDelete, setConfirmingDelete] = (0, react.useState)(false);
			const resolvedDepth = Number(injectionDepth);
			const resolvedOrder = Number(injectionOrder);
			const validInjection = injectionPosition === 0 || Number.isSafeInteger(resolvedDepth) && resolvedDepth >= 0 && resolvedDepth <= 9999 && Number.isSafeInteger(resolvedOrder) && resolvedOrder >= 0 && resolvedOrder <= 9999;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-dialog": true,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": `编辑${prompt.name || prompt.identifier}`,
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.7)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1150
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #151518)",
						border: "1px solid var(--dsw-alias-border-l2, #38383d)",
						borderRadius: "14px",
						boxShadow: "0 24px 80px rgba(0,0,0,.5)",
						display: "flex",
						flexDirection: "column",
						maxHeight: "min(820px, 90vh)",
						maxWidth: "760px",
						overflow: "hidden",
						width: "min(94vw, 760px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								borderBottom: "1px solid var(--dsw-alias-border-l2, #343438)",
								display: "grid",
								gap: "8px",
								gridTemplateColumns: "minmax(0, 1fr) 130px",
								padding: "14px 18px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										...fieldLabelStyle,
										margin: 0
									},
									children: ["模块名称", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										"aria-label": "模块名称",
										value: name,
										onChange: (event) => {
											setName(event.target.value);
										},
										style: fieldInputStyle
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										...fieldLabelStyle,
										margin: 0
									},
									children: ["消息角色", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										"aria-label": "消息角色",
										value: role,
										onChange: (event) => {
											setRole(event.target.value);
										},
										style: fieldInputStyle,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "system",
												children: "系统"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "user",
												children: "用户"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "assistant",
												children: "助手"
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontFamily: "ui-monospace, monospace",
										fontSize: "10px",
										gridColumn: "1 / -1",
										opacity: .4
									},
									children: prompt.identifier
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										...fieldLabelStyle,
										margin: 0
									},
									children: ["插入位置", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										"aria-label": "插入位置",
										value: injectionPosition,
										onChange: (event) => {
											setInjectionPosition(Number(event.target.value));
										},
										style: fieldInputStyle,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 0,
											children: "相对（按模块顺序）"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 1,
											children: "聊天内（按历史深度）"
										})]
									})]
								}),
								injectionPosition === 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										style: {
											...fieldLabelStyle,
											margin: 0
										},
										children: ["历史深度", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											"aria-label": "历史深度",
											type: "number",
											min: 0,
											max: 9999,
											value: injectionDepth,
											onChange: (event) => {
												setInjectionDepth(event.target.value);
											},
											style: fieldInputStyle
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										style: {
											...fieldLabelStyle,
											margin: 0
										},
										children: ["同深度优先级", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											"aria-label": "同深度优先级",
											type: "number",
											min: 0,
											max: 9999,
											value: injectionOrder,
											onChange: (event) => {
												setInjectionOrder(event.target.value);
											},
											style: fieldInputStyle
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											alignSelf: "end",
											color: "#8ebf9c",
											fontSize: "10px",
											lineHeight: 1.45
										},
										children: "生成时按历史深度插入；同深度优先级较高的内容在前"
									})
								] })
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							"aria-label": "提示内容",
							autoFocus: true,
							spellCheck: false,
							value: content,
							onChange: (event) => {
								setContent(event.target.value);
							},
							style: {
								background: "var(--dsw-alias-bg-layer-1, #202024)",
								border: 0,
								color: "inherit",
								flex: "1 1 auto",
								font: "13px/1.65 ui-monospace, SFMono-Regular, Consolas, monospace",
								minHeight: "360px",
								outline: "none",
								padding: "16px 18px",
								resize: "none",
								whiteSpace: "pre-wrap"
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							style: {
								alignItems: "center",
								borderTop: "1px solid var(--dsw-alias-border-l2, #343438)",
								display: "flex",
								gap: "9px",
								justifyContent: "flex-end",
								padding: "12px 18px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										fontSize: "10px",
										marginRight: "auto",
										opacity: .42
									},
									children: [content.length.toLocaleString(), " 字符"]
								}),
								onDelete !== void 0 && (confirmingDelete ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										color: "#e47a7a",
										fontSize: "11px"
									},
									children: "永久移除此模块？"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: onDelete,
									style: {
										...secondaryButtonStyle,
										borderColor: "#a94f4f",
										color: "#ef8a8a"
									},
									children: "确认删除"
								})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										setConfirmingDelete(true);
									},
									style: {
										...secondaryButtonStyle,
										marginRight: "auto"
									},
									children: "删除模块"
								})),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: onClose,
									style: secondaryButtonStyle,
									children: "取消"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: name.trim() === "" || !validInjection,
									onClick: () => {
										onApply({
											name: name.trim(),
											role,
											content,
											injectionPosition,
											injectionDepth: resolvedDepth,
											injectionOrder: resolvedOrder
										});
									},
									style: primaryButtonStyle,
									children: "应用修改"
								})
							]
						})
					]
				})
			});
		}
		function PresetImportDialog({ entries, onClose, onImport, onLibrary }) {
			const inputRef = (0, react.useRef)(null);
			const [importing, setImporting] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			(0, react.useEffect)(() => {
				onLibrary({ operation: "list" }).catch(() => void 0);
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-dialog": true,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "导入预设",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.62)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1100
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget && !importing) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #151518)",
						border: "1px solid var(--dsw-alias-border-l2, #38383d)",
						borderRadius: "16px",
						boxShadow: "0 24px 80px rgba(0,0,0,.45)",
						maxWidth: "480px",
						padding: "24px",
						width: "min(94vw, 480px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							style: {
								fontSize: "17px",
								margin: 0
							},
							children: "为此角色选择预设"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								fontSize: "13px",
								lineHeight: 1.65,
								margin: "9px 0 22px",
								opacity: .58
							},
							children: "从预设库选取，或导入 SillyTavern Chat Completion 预设 JSON。选中后会为当前会话创建独立副本"
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							style: {
								color: "#e47a7a",
								fontSize: "12px",
								margin: "0 0 12px"
							},
							children: error
						}),
						entries.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: "7px",
								marginBottom: "20px",
								maxHeight: "280px",
								overflowY: "auto"
							},
							children: entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetLibraryRow, {
								entry,
								busy: importing,
								onSelect: () => {
									setImporting(true);
									setError(void 0);
									onLibrary({
										operation: "select",
										id: entry.id
									}).then(onClose, (reason) => {
										setError(reason instanceof Error ? reason.message : "预设选择失败");
										setImporting(false);
									});
								}
							}, entry.id))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							ref: inputRef,
							type: "file",
							accept: ".json,application/json",
							hidden: true,
							onChange: (event) => {
								const file = event.currentTarget.files?.[0];
								event.currentTarget.value = "";
								if (file === void 0) return;
								setImporting(true);
								setError(void 0);
								onImport(file).then(onClose, (reason) => {
									setError(reason instanceof Error ? reason.message : "预设导入失败");
									setImporting(false);
								});
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "9px",
								justifyContent: "flex-end"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: importing,
								onClick: onClose,
								style: secondaryButtonStyle,
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: importing,
								onClick: () => {
									inputRef.current?.click();
								},
								style: primaryButtonStyle,
								children: importing ? "导入中…" : "选择预设文件"
							})]
						})
					]
				})
			});
		}
		function PresetLibraryRow({ entry, active = false, busy = false, onSelect, onRename, onDelete }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					alignItems: "center",
					background: active ? `color-mix(in srgb, ${color} 12%, transparent)` : "var(--dsw-alias-bg-layer-1, #202024)",
					border: `1px solid ${active ? `color-mix(in srgb, ${color} 34%, transparent)` : "var(--dsw-alias-border-l2, #39393f)"}`,
					borderRadius: "10px",
					display: "flex",
					gap: "10px",
					padding: "10px 11px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { minWidth: 0 },
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: "13px",
									fontWeight: 600,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: entry.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: "10px",
									marginTop: "4px",
									opacity: .48
								},
								children: [
									entry.enabledCount,
									"/",
									entry.promptCount,
									" 项启用 · ",
									entry.regexScriptCount,
									" 条正则",
									active ? " · 当前来源" : ""
								]
							}),
							entry.tavernHelper !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: "10px",
									marginTop: "3px",
									opacity: .48
								},
								children: ["Tavern Helper · ", presetTavernHelperSummaryText(entry.tavernHelper)]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy || active,
						onClick: onSelect,
						style: {
							...miniButtonStyle,
							marginLeft: "auto"
						},
						children: active ? "已选" : "使用"
					}),
					onRename !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy,
						onClick: onRename,
						style: miniButtonStyle,
						children: "改名"
					}),
					onDelete !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy,
						onClick: onDelete,
						style: miniButtonStyle,
						children: "删除"
					})
				]
			});
		}
		function PresetLibraryDialog({ entries, activeId, onClose, onAction }) {
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-dialog": true,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "预设库",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.66)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1200
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget && !busy) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #151518)",
						border: "1px solid var(--dsw-alias-border-l2, #38383d)",
						borderRadius: "16px",
						boxShadow: "0 24px 80px rgba(0,0,0,.45)",
						maxWidth: "560px",
						padding: "22px",
						width: "min(94vw, 560px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								alignItems: "center",
								display: "flex",
								gap: "10px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								style: {
									fontSize: "17px",
									margin: 0
								},
								children: "预设库"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: "12px",
									margin: "6px 0 0",
									opacity: .52
								},
								children: "使用预设只会替换当前会话的独立副本"
							})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: onClose,
								"aria-label": "关闭预设库",
								style: {
									background: "transparent",
									border: 0,
									color: "inherit",
									cursor: "pointer",
									fontSize: "22px",
									marginLeft: "auto"
								},
								children: "×"
							})]
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							style: {
								color: "#e47a7a",
								fontSize: "12px"
							},
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: "7px",
								marginTop: "18px",
								maxHeight: "55vh",
								overflowY: "auto"
							},
							children: [entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetLibraryRow, {
								entry,
								active: entry.id === activeId,
								busy,
								onSelect: () => {
									setBusy(true);
									setError(void 0);
									onAction({
										operation: "select",
										id: entry.id
									}).catch((reason) => {
										setError(reason instanceof Error ? reason.message : "预设选择失败");
										setBusy(false);
									});
								},
								onRename: () => {
									const name = window.prompt("预设名称", entry.name)?.trim();
									if (name === void 0 || name === "" || name === entry.name) return;
									setBusy(true);
									setError(void 0);
									onAction({
										operation: "rename",
										id: entry.id,
										name
									}).then(() => {
										setBusy(false);
									}, (reason) => {
										setError(reason instanceof Error ? reason.message : "改名失败");
										setBusy(false);
									});
								},
								onDelete: () => {
									if (!window.confirm(`从预设库删除“${entry.name}”？当前会话不会受影响`)) return;
									setBusy(true);
									setError(void 0);
									onAction({
										operation: "delete",
										id: entry.id
									}).then(() => {
										setBusy(false);
									}, (reason) => {
										setError(reason instanceof Error ? reason.message : "删除失败");
										setBusy(false);
									});
								}
							}, entry.id)), entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: "13px",
									opacity: .52,
									padding: "30px 8px",
									textAlign: "center"
								},
								children: "预设库还是空的，导入一份 JSON 后会自动收藏"
							})]
						})
					]
				})
			});
		}
		function PresetNumberField({ label, hint, value, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				style: fieldLabelStyle,
				children: [
					label,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							float: "right",
							fontSize: "10px",
							fontWeight: 400,
							opacity: .45
						},
						children: hint
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						inputMode: "decimal",
						value,
						onChange: (event) => {
							onChange(event.target.value);
						},
						style: fieldInputStyle
					})
				]
			});
		}
		const fieldLabelStyle = {
			display: "block",
			fontSize: "11px",
			fontWeight: 560,
			marginBottom: "13px",
			opacity: .72
		};
		const fieldInputStyle = {
			background: "var(--dsw-alias-bg-layer-1, #202024)",
			border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
			borderRadius: "8px",
			color: "inherit",
			display: "block",
			font: "inherit",
			fontSize: "12px",
			marginTop: "6px",
			padding: "8px 9px",
			width: "100%"
		};
		const miniButtonStyle = {
			background: "transparent",
			border: "1px solid var(--dsw-alias-border-l2, #424248)",
			borderRadius: "6px",
			color: "inherit",
			cursor: "pointer",
			font: "inherit",
			fontSize: "11px",
			height: "25px",
			minWidth: "25px",
			padding: "2px 6px"
		};
		const secondaryButtonStyle = {
			...miniButtonStyle,
			height: "34px",
			padding: "5px 14px"
		};
		const primaryButtonStyle = {
			...secondaryButtonStyle,
			background: color,
			borderColor: color,
			color: "#fff",
			fontWeight: 600
		};
		const presetManagerResponsiveStyle = `
@media (max-width: 720px) {
  .agent-rp-preset-overlay { padding: 8px !important; }
  .agent-rp-preset-dialog {
    border-radius: 12px !important;
    max-height: calc(100dvh - 16px) !important;
    width: calc(100vw - 16px) !important;
  }
  .agent-rp-preset-body {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    padding: 12px 14px !important;
  }
  .agent-rp-preset-generation {
    border-bottom: 1px solid var(--dsw-alias-border-l2, #343438);
    border-left: 0 !important;
    display: grid;
    gap: 0 10px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    order: -1;
    padding: 0 0 11px !important;
  }
  .agent-rp-preset-generation > h3,
  .agent-rp-preset-generation > p { grid-column: 1 / -1; }
  .agent-rp-preset-generation > p { margin-top: 2px !important; }
  .agent-rp-preset-list { flex: 1 1 auto; }
  .agent-rp-preset-footer { padding: 10px 14px !important; }
  .agent-rp-runtime-inspector-body {
    display: flex !important;
    flex-direction: column !important;
    overflow-y: auto !important;
  }
  .agent-rp-runtime-inspector-order {
    border-bottom: 1px solid var(--dsw-alias-border-l2, #343438);
    border-right: 0 !important;
    flex: 0 0 auto;
    max-height: 42vh;
  }
}
@media (max-width: 460px) {
  .agent-rp-preset-generation { grid-template-columns: 1fr 1fr; }
  .agent-rp-preset-generation > label:last-of-type { grid-column: 1 / -1; }
  .agent-rp-preset-footer { flex-wrap: wrap; }
  .agent-rp-preset-footer > button:first-of-type { margin-right: auto !important; }
}
`;
		const imageModeLabels = {
			scene: "当前场景",
			portrait: "角色立绘",
			avatar: "角色头像",
			custom: "自定义描述"
		};
		function imagePrompt(mode, projection, note) {
			const detail = [projection.description, projection.personality].map((value) => value.trim()).filter(Boolean).join("\n").slice(0, 3e3);
			const extra = note.trim();
			if (mode === "custom") return extra;
			const subject = `角色：${projection.characterName}${detail === "" ? "" : `\n角色设定：${detail}`}`;
			if (mode === "scene") return `叙事插画\n${subject}\n场景：${projection.scenario.trim() || "延续当前对话中的场景"}${extra === "" ? "" : `\n补充：${extra}`}`.slice(0, 8e3);
			if (mode === "portrait") return `角色立绘，完整人物设计，清楚呈现服装与姿态\n${subject}${extra === "" ? "" : `\n补充：${extra}`}`.slice(0, 8e3);
			return `角色头像，头肩构图，表情自然，面部清晰\n${subject}${extra === "" ? "" : `\n补充：${extra}`}`.slice(0, 8e3);
		}
		function ImageGenerationDialog({ projection, initialMode = "scene", initialNote = "", onClose, onGenerate }) {
			const [mode, setMode] = (0, react.useState)(initialMode);
			const [note, setNote] = (0, react.useState)(initialNote);
			const prompt = imagePrompt(mode, projection, note);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-dialog": true,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "生成聊天插图",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.62)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "20px",
					position: "fixed",
					zIndex: 1e3
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #111216)",
						border: "1px solid var(--dsw-alias-border-l2, #35373d)",
						borderRadius: "14px",
						boxShadow: "0 20px 64px rgba(0,0,0,.45)",
						maxWidth: "620px",
						padding: "20px",
						width: "min(94vw, 620px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								alignItems: "center",
								display: "flex",
								gap: "12px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { flex: 1 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: {
										fontSize: "17px",
										margin: 0
									},
									children: "生成聊天插图"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										fontSize: "12px",
										margin: "5px 0 0",
										opacity: .55
									},
									children: "选择画什么，确认后任务会留在这段聊天里"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "关闭绘图",
								onClick: onClose,
								style: {
									background: "transparent",
									border: 0,
									color: "inherit",
									cursor: "pointer",
									font: "inherit",
									fontSize: "21px",
									opacity: .6
								},
								children: "×"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gap: "8px",
								gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
								marginTop: "18px"
							},
							children: Object.entries(imageModeLabels).map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setMode(value);
									setNote("");
								},
								style: {
									background: value === mode ? `color-mix(in srgb, ${color} 15%, transparent)` : "transparent",
									border: `1px solid ${value === mode ? `color-mix(in srgb, ${color} 45%, transparent)` : "var(--dsw-alias-border-l2, #3d3d43)"}`,
									borderRadius: "9px",
									color: "inherit",
									cursor: "pointer",
									font: "inherit",
									fontSize: "12px",
									padding: "9px 10px"
								},
								children: label
							}, value))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: {
								display: "grid",
								fontSize: "12px",
								gap: "7px",
								marginTop: "16px"
							},
							children: [mode === "custom" ? "画面描述" : "补充说明（可不填）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								autoFocus: true,
								value: note,
								maxLength: 8e3,
								rows: 5,
								placeholder: mode === "custom" ? "写下你想看到的画面…" : "例如：黄昏、暖色灯光、电影感构图",
								onChange: (event) => {
									setNote(event.target.value);
								},
								style: {
									...settingsFieldStyle,
									lineHeight: 1.6,
									resize: "vertical"
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
							style: {
								fontSize: "11px",
								marginTop: "12px",
								opacity: .62
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
								style: { cursor: "pointer" },
								children: "查看将发送给图片服务的提示词"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									lineHeight: 1.6,
									marginTop: "7px",
									maxHeight: "150px",
									overflow: "auto",
									whiteSpace: "pre-wrap"
								},
								children: prompt
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							style: {
								display: "flex",
								gap: "9px",
								justifyContent: "flex-end",
								marginTop: "20px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: onClose,
								style: secondaryButtonStyle,
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: prompt.trim() === "",
								onClick: () => {
									onGenerate({
										mode,
										prompt
									});
									onClose();
								},
								style: primaryButtonStyle,
								children: "开始绘图"
							})]
						})
					]
				})
			});
		}
		function useGeneratedImageJob(jobId, settled) {
			const [revision, setRevision] = (0, react.useState)(0);
			const [job, setJob] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			(0, react.useEffect)(() => {
				let active = true;
				let timer;
				const load = async () => {
					try {
						const response = await fetch(generatedImageJobUrl(jobId), { headers: { accept: "application/json" } });
						const value = await response.json();
						if (!response.ok || value.job === void 0) throw new Error(value.error ?? `图片任务读取失败（${response.status}）`);
						if (!active) return;
						setJob(value.job);
						setError(void 0);
						if (![
							"completed",
							"failed",
							"cancelled"
						].includes(value.job.status)) timer = setTimeout(() => {
							load();
						}, 1e3);
					} catch (reason) {
						if (!active) return;
						const message = reason instanceof Error ? reason.message : String(reason);
						if (settled) setError(message);
						else timer = setTimeout(() => {
							load();
						}, 700);
					}
				};
				load();
				return () => {
					active = false;
					if (timer !== void 0) clearTimeout(timer);
				};
			}, [
				jobId,
				revision,
				settled
			]);
			return {
				...job === void 0 ? {} : { job },
				...error === void 0 ? {} : { error },
				refresh: () => {
					setRevision((value) => value + 1);
				}
			};
		}
		function ImageGenerationCommandCard({ node, sessionId, runImageGeneration }) {
			let request;
			try {
				request = node.args === null ? void 0 : parseImageGenerationRequest(node.args);
			} catch {
				request = void 0;
			}
			const record = decodeImageGenerationRecord(node.outcome?.text);
			const jobId = request?.jobId ?? record?.jobId;
			if (jobId === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-image-card": true,
				style: {
					fontSize: "12px",
					opacity: .62
				},
				children: "无法读取这条绘图记录"
			});
			const { job, error, refresh } = useGeneratedImageJob(jobId, node.outcome !== null);
			const resolvedRequest = job?.request ?? request;
			const [promptOpen, setPromptOpen] = (0, react.useState)(false);
			const [cancelling, setCancelling] = (0, react.useState)(false);
			const status = job?.status ?? (node.outcome === null ? "queued" : node.outcome.kind === "error" ? "failed" : "running");
			const failure = job?.error ?? (node.outcome?.kind === "error" ? node.outcome.text : void 0) ?? error;
			const title = resolvedRequest === void 0 ? "聊天插图" : imageModeLabels[resolvedRequest.mode];
			const retry = () => {
				if (resolvedRequest !== void 0) runImageGeneration(sessionId, {
					mode: resolvedRequest.mode,
					prompt: resolvedRequest.prompt
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
				"data-agent-rp-image-card": true,
				style: {
					background: "color-mix(in srgb, var(--dsw-alias-bg-layer-1, #202126) 82%, transparent)",
					border: "1px solid var(--dsw-alias-border-l2, #383a41)",
					borderRadius: "12px",
					maxWidth: "680px",
					overflow: "hidden",
					width: "100%"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						style: {
							alignItems: "center",
							display: "flex",
							gap: "9px",
							padding: "10px 12px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: {
									color,
									fontSize: "15px"
								},
								children: "✦"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									fontSize: "12px",
									fontWeight: 620
								},
								children: title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: "11px",
									marginLeft: "auto",
									opacity: .52
								},
								children: status === "completed" ? "已完成" : status === "failed" ? "生成失败" : status === "cancelled" ? "已取消" : job?.phase ?? "正在排队"
							})
						]
					}),
					(status === "queued" || status === "running") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							background: "rgba(127,127,127,.15)",
							height: "3px"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
							background: color,
							height: "100%",
							transition: "width .35s ease",
							width: `${Math.max(3, (job?.progress ?? .02) * 100)}%`
						} })
					}),
					status === "completed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						src: generatedImageAssetUrl(jobId),
						alt: title,
						loading: "lazy",
						style: {
							background: "rgba(0,0,0,.2)",
							display: "block",
							maxHeight: "720px",
							objectFit: "contain",
							width: "100%"
						}
					}),
					(failure !== void 0 || status === "cancelled") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: failure === void 0 ? "status" : "alert",
						style: {
							color: failure === void 0 ? "inherit" : "var(--dsw-alias-state-danger, #df6f7a)",
							fontSize: "12px",
							lineHeight: 1.55,
							padding: "4px 12px 10px"
						},
						children: failure ?? "这次绘图已取消"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
						style: {
							alignItems: "center",
							display: "flex",
							flexWrap: "wrap",
							gap: "7px",
							padding: "9px 12px 11px"
						},
						children: [
							resolvedRequest !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setPromptOpen((value) => !value);
								},
								style: generationButtonStyle,
								children: promptOpen ? "收起提示词" : "查看提示词"
							}),
							(status === "queued" || status === "running") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: cancelling,
								onClick: () => {
									setCancelling(true);
									fetch(`${generatedImageJobUrl(jobId)}/cancel`, {
										method: "POST",
										headers: { accept: "application/json" }
									}).then(() => {
										refresh();
									}).finally(() => {
										setCancelling(false);
									});
								},
								style: generationButtonStyle,
								children: cancelling ? "正在取消…" : "取消"
							}),
							(status === "completed" || status === "failed" || status === "cancelled") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: retry,
								style: generationButtonStyle,
								children: "重绘"
							}),
							status === "completed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: generatedImageAssetUrl(jobId, true),
								download: true,
								style: {
									...generationButtonStyle,
									textDecoration: "none"
								},
								children: "下载"
							})
						]
					}),
					promptOpen && resolvedRequest !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							borderTop: "1px solid var(--dsw-alias-border-l2, #383a41)",
							fontSize: "11px",
							lineHeight: 1.6,
							maxHeight: "180px",
							overflow: "auto",
							padding: "10px 12px",
							whiteSpace: "pre-wrap"
						},
						children: resolvedRequest.prompt
					})
				]
			});
		}
		function RoleplayStatusDialog({ characterName, source, onClose }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-agent-rp-dialog": true,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": "当前状态",
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.62)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "24px",
					position: "fixed",
					zIndex: 1e3
				},
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #111216)",
						border: "1px solid var(--dsw-alias-border-l2, #35373d)",
						borderRadius: "14px",
						boxShadow: "0 20px 64px rgba(0,0,0,.45)",
						maxHeight: "88vh",
						maxWidth: "1240px",
						overflow: "hidden",
						position: "relative",
						width: "min(94vw, 1240px)"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "关闭当前状态",
						onClick: onClose,
						style: {
							alignItems: "center",
							background: "rgba(13,17,27,.88)",
							border: "1px solid rgba(116,143,184,.35)",
							borderRadius: "50%",
							color: "#edf4ff",
							cursor: "pointer",
							display: "flex",
							fontSize: "20px",
							height: "34px",
							justifyContent: "center",
							position: "absolute",
							right: "12px",
							top: "12px",
							width: "34px",
							zIndex: 2
						},
						children: "×"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
						title: `${characterName}的当前状态`,
						sandbox: "allow-scripts",
						srcDoc: source,
						style: {
							background: "transparent",
							border: 0,
							colorScheme: "dark",
							display: "block",
							height: "min(760px, 82vh)",
							width: "100%"
						}
					})]
				})
			});
		}
		function tavernWorldbookEntry(entry) {
			const parsedUid = Number(entry.sourceId);
			return {
				uid: Number.isSafeInteger(parsedUid) && parsedUid >= 0 ? parsedUid : entry.index,
				name: entry.name ?? entry.comment ?? "",
				enabled: entry.enabled && !entry.deleted,
				strategy: {
					type: entry.constant ? "constant" : "selective",
					keys: entry.keys,
					keys_secondary: {
						logic: entry.secondaryLogic === "and-all" ? "and_all" : entry.secondaryLogic === "not-all" ? "not_all" : entry.secondaryLogic === "not-any" ? "not_any" : "and_any",
						keys: entry.secondaryKeys
					},
					scan_depth: entry.scanDepth ?? "same_as_global"
				},
				position: {
					type: entry.position === "before_char" ? "before_character_definition" : "after_character_definition",
					role: "system",
					depth: 4,
					order: entry.insertionOrder
				},
				content: entry.content,
				probability: 100,
				recursion: {
					prevent_incoming: false,
					prevent_outgoing: false,
					delay_until: null
				},
				effect: {
					sticky: null,
					cooldown: null,
					delay: null
				},
				...entry.ignoreBudget ? { ignoreBudget: true } : {}
			};
		}
		const tavernPresetSystemPromptIds = /* @__PURE__ */ new Set([
			"main",
			"nsfw",
			"jailbreak",
			"enhanceDefinitions"
		]);
		const tavernPresetPlaceholderPromptIds = /* @__PURE__ */ new Set([
			"worldInfoBefore",
			"personaDescription",
			"charDescription",
			"charPersonality",
			"scenario",
			"worldInfoAfter",
			"dialogueExamples",
			"chatHistory"
		]);
		function tavernPresetPrompt(prompt) {
			const system = tavernPresetSystemPromptIds.has(prompt.identifier);
			const placeholder = tavernPresetPlaceholderPromptIds.has(prompt.identifier);
			const position = prompt.injectionPosition === 1 ? {
				type: "in_chat",
				depth: prompt.injectionDepth ?? 4,
				order: prompt.injectionOrder ?? 100
			} : { type: "relative" };
			return {
				id: prompt.identifier,
				identifier: prompt.identifier,
				name: prompt.name,
				enabled: prompt.enabled,
				role: prompt.role,
				...system ? {} : { position },
				...placeholder ? {} : { content: prompt.content },
				system_prompt: prompt.systemPrompt,
				marker: prompt.marker,
				forbid_overrides: prompt.forbidOverrides
			};
		}
		function tavernRegex(script, index, scope) {
			return {
				id: script.id ?? `${scope}-regex-${index}`,
				script_name: script.scriptName,
				enabled: !script.disabled,
				find_regex: script.findRegex,
				trim_strings: [...script.trimStrings],
				replace_string: script.replaceString,
				source: {
					user_input: script.placement.includes(1),
					ai_output: script.placement.includes(2),
					slash_command: script.placement.includes(3),
					world_info: script.placement.includes(5),
					reasoning: script.placement.includes(6)
				},
				destination: {
					display: script.markdownOnly,
					prompt: script.promptOnly
				},
				run_on_edit: script.runOnEdit,
				min_depth: script.minDepth,
				max_depth: script.maxDepth,
				...scope === "preset" ? { disabled: script.disabled } : {}
			};
		}
		function tavernHelperScript(script, publicTree = false) {
			return {
				type: "script",
				id: script.id,
				name: script.name,
				content: script.content,
				info: script.info,
				enabled: script.enabled,
				button: {
					enabled: script.buttonEnabled,
					buttons: script.buttons.map((button) => ({ ...button }))
				},
				data: structuredClone(script.data),
				...publicTree ? { export_with: {
					data: true,
					button: true
				} } : {}
			};
		}
		function tavernScriptTrees(projection, scope) {
			const replacement = projection.tavern?.scriptTrees?.[scope];
			let normalized;
			if (replacement !== void 0) normalized = replacement;
			else normalized = (scope === "preset" ? projection.preset?.tavernHelperScripts ?? [] : scope === "character" ? projection.frontend?.tavernHelperScripts ?? [] : []).map((script) => tavernHelperScript(script, true));
			const variables = projection.tavern?.scripts ?? {};
			const withVariables = (script) => ({
				...script,
				data: variables[script.id] ?? script.data
			});
			return normalized.map((tree) => tree.type === "folder" ? {
				...tree,
				scripts: tree.scripts.map(withVariables)
			} : withVariables(tree));
		}
		function activeTavernScripts(projection, scope) {
			const replacement = projection.tavern?.scriptTrees?.[scope];
			if (replacement !== void 0) return parseTavernHelperScripts(replacement, `session.${scope}.scriptTrees`);
			return scope === "preset" ? projection.preset?.tavernHelperScripts ?? [] : scope === "character" ? projection.frontend?.tavernHelperScripts ?? [] : [];
		}
		function currentTavernPreset(projection) {
			const preset = projection.preset;
			if (preset === void 0) return void 0;
			const generation = preset.generation;
			const value = {
				settings: {
					max_context: 2e6,
					max_completion_tokens: generation.maxTokens ?? 300,
					reply_count: 1,
					should_stream: true,
					temperature: generation.temperature ?? 1,
					frequency_penalty: generation.frequencyPenalty ?? 0,
					presence_penalty: generation.presencePenalty ?? 0,
					repetition_penalty: generation.repetitionPenalty ?? 1,
					top_p: generation.topP ?? 1,
					min_p: generation.minP ?? 0,
					top_k: generation.topK ?? 0,
					top_a: generation.topA ?? 0,
					seed: -1,
					squash_system_messages: false,
					reasoning_effort: generation.reasoningEffort ?? "auto",
					request_thoughts: false,
					request_images: false,
					enable_function_calling: false,
					enable_web_search: false,
					allow_sending_images: "auto",
					allow_sending_videos: false,
					character_name_prefix: "none",
					wrap_user_messages_in_quotes: false
				},
				prompts: preset.prompts.filter((prompt) => prompt.attached).map(tavernPresetPrompt),
				prompts_unused: preset.prompts.filter((prompt) => !prompt.attached).map(tavernPresetPrompt),
				extensions: {
					regex_scripts: preset.regexScripts.map((script, index) => tavernRegex(script, index, "preset")),
					tavern_helper: {
						scripts: preset.tavernHelperScripts.map((script) => tavernHelperScript(script)),
						variables: structuredClone(preset.tavernHelperVariables)
					}
				}
			};
			return {
				name: preset.name,
				revision: preset.revision,
				value
			};
		}
		function tavernObject(value, label) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} 必须是对象`);
			return value;
		}
		function tavernPresetConfiguration(projection, value, revision) {
			const active = projection.preset;
			if (active === void 0) throw new Error("当前会话没有预设");
			const preset = tavernObject(value, "预设");
			const used = Array.isArray(preset.prompts) ? preset.prompts : [];
			const unused = Array.isArray(preset.prompts_unused) ? preset.prompts_unused : [];
			const currentById = new Map(active.prompts.map((prompt) => [prompt.identifier, prompt]));
			const seen = /* @__PURE__ */ new Set();
			const definitions = [...used, ...unused].map((candidate, index) => {
				const item = tavernObject(candidate, `预设提示词 ${index + 1}`);
				const identifier = typeof item.id === "string" && item.id.trim() !== "" ? item.id : typeof item.identifier === "string" ? item.identifier : "";
				if (identifier.trim() === "" || seen.has(identifier)) throw new Error("预设提示词标识无效或重复");
				seen.add(identifier);
				const current = currentById.get(identifier);
				const role = item.role === "user" || item.role === "assistant" || item.role === "system" ? item.role : current?.role ?? "system";
				const position = typeof item.position === "object" && item.position !== null && !Array.isArray(item.position) ? item.position : void 0;
				const inChat = position?.type === "in_chat";
				const withPosition = inChat || current?.injectionPosition !== void 0 || current === void 0 ? {
					injectionPosition: inChat ? 1 : 0,
					...inChat && Number.isSafeInteger(position?.depth) ? { injectionDepth: Number(position.depth) } : {},
					...inChat && Number.isSafeInteger(position?.order) ? { injectionOrder: Number(position.order) } : {}
				} : {};
				return {
					identifier,
					name: typeof item.name === "string" && item.name.trim() !== "" ? item.name : current?.name ?? identifier,
					role,
					content: typeof item.content === "string" ? item.content : current?.content ?? "",
					...withPosition
				};
			});
			const order = used.map((candidate, index) => {
				const item = tavernObject(candidate, `预设顺序 ${index + 1}`);
				return {
					identifier: typeof item.id === "string" && item.id.trim() !== "" ? item.id : typeof item.identifier === "string" ? item.identifier : "",
					enabled: item.enabled === true
				};
			});
			const settings = typeof preset.settings === "object" && preset.settings !== null && !Array.isArray(preset.settings) ? preset.settings : {};
			const generation = {
				...typeof settings.temperature === "number" && Number.isFinite(settings.temperature) && (active.generation.temperature !== void 0 || settings.temperature !== 1) ? { temperature: settings.temperature } : {},
				...Number.isSafeInteger(settings.max_completion_tokens) && Number(settings.max_completion_tokens) > 0 && (active.generation.maxTokens !== void 0 || settings.max_completion_tokens !== 300) ? { maxTokens: Number(settings.max_completion_tokens) } : {},
				...typeof settings.reasoning_effort === "string" && settings.reasoning_effort.trim() !== "" && (active.generation.reasoningEffort !== void 0 || settings.reasoning_effort !== "auto") ? { reasoningEffort: settings.reasoning_effort } : {}
			};
			const extensions = typeof preset.extensions === "object" && preset.extensions !== null && !Array.isArray(preset.extensions) ? preset.extensions : {};
			const regexScripts = (Array.isArray(extensions.regex_scripts) ? extensions.regex_scripts : []).map(importTavernRegex);
			return {
				operation: "replace",
				revision,
				order,
				prompts: definitions,
				content: [],
				generation,
				regex: regexScripts.map((script, index) => ({
					index,
					disabled: script.disabled,
					minDepth: script.minDepth,
					maxDepth: script.maxDepth
				})),
				regexScripts
			};
		}
		function tavernScriptSnapshot(projection, script, approvedScriptOrigins, sessionId) {
			const state = projection.tavern;
			const message = {
				...state?.scopes.message ?? {},
				...projection.mvu === void 0 ? {} : { stat_data: projection.mvu.statData }
			};
			const worldbooks = {
				...Object.fromEntries(projection.worldInfo.books.map((book) => [book.name, book.entries.filter((entry) => !entry.deleted).map(tavernWorldbookEntry)])),
				...state?.worldbooks
			};
			for (const name of state?.deletedWorldbookNames ?? []) delete worldbooks[name];
			const characterBook = projection.worldInfo.books.find((book) => book.source === "character");
			const importedGlobalBooks = projection.worldInfo.books.filter((book) => book.source === "standalone" && !book.id.startsWith("script:")).map((book) => book.name);
			return {
				scriptId: script.id,
				scriptName: script.name,
				scriptInfo: script.info,
				buttons: script.buttons,
				characterName: projection.characterName,
				characterId: projection.tavern?.characterSourceId ?? projection.avatarLibraryId ?? projection.characterName,
				...projection.characterCardRaw === void 0 ? {} : { characterCard: projection.characterCardRaw },
				chatId: String(sessionId),
				...projection.userName === void 0 ? {} : { userName: projection.userName },
				...projection.persona === void 0 ? {} : { persona: projection.persona },
				...currentTavernPreset(projection) === void 0 ? {} : { preset: currentTavernPreset(projection) },
				extensionSettings: (() => {
					try {
						return readTavernExtensionSettings(window.localStorage);
					} catch {
						return {};
					}
				})(),
				approvedScriptOrigins,
				scopes: {
					global: state?.scopes.global ?? {},
					preset: state?.scopes.preset ?? {},
					character: state?.scopes.character ?? projection.frontend?.tavernHelperVariables ?? {},
					chat: state?.scopes.chat ?? {},
					message,
					script: state?.scripts[script.id] ?? script.data
				},
				worldbooks,
				worldbookBindings: {
					global: state?.worldbookBindings?.global ?? importedGlobalBooks,
					character: state?.worldbookBindings?.character ?? {
						primary: characterBook?.name ?? null,
						additional: []
					},
					chat: state?.worldbookBindings?.chat ?? null
				},
				activeWorldbookEntries: projection.worldInfo.books.flatMap((book) => book.entries.filter((entry) => entry.active && !entry.deleted).map((entry) => `${book.name}.${tavernWorldbookEntry(entry).uid}`)),
				messages: (state?.messages ?? []).map((entry, index, entries) => ({
					...entry,
					data: index === entries.length - 1 ? message : {},
					extra: {}
				})),
				characterRegexScripts: (projection.frontend?.regexScripts ?? []).map((entry, index) => tavernRegex(entry, index, "character")),
				globalScriptTrees: tavernScriptTrees(projection, "global"),
				presetScriptTrees: tavernScriptTrees(projection, "preset"),
				characterScriptTrees: tavernScriptTrees(projection, "character"),
				injectedPrompts: (state?.injectedPrompts ?? []).flatMap((prompt) => {
					if (prompt.scriptId !== script.id) return [];
					const { scriptId: _scriptId, ...value } = prompt;
					return [value];
				}),
				displayRegexScripts: [...projection.preset?.regexScripts ?? [], ...projection.frontend?.regexScripts ?? []]
			};
		}
		function runtimeScriptButtons(value) {
			if (!Array.isArray(value) || value.length > 50) return void 0;
			const names = /* @__PURE__ */ new Set();
			const buttons = [];
			for (const item of value) {
				if (typeof item !== "object" || item === null || Array.isArray(item)) return void 0;
				const button = item;
				if (typeof button.name !== "string" || button.name.trim() === "" || button.name.length > 200 || typeof button.visible !== "boolean" || names.has(button.name)) return void 0;
				names.add(button.name);
				buttons.push({
					name: button.name,
					visible: button.visible
				});
			}
			return buttons;
		}
		function runtimePopupOptions(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
			const source = value;
			const label = (key) => {
				const item = source[key];
				return typeof item === "string" || typeof item === "boolean" ? item : void 0;
			};
			const text = (key) => {
				const item = source[key];
				return typeof item === "string" && item.length <= 2e3 ? item : void 0;
			};
			const flag = (key) => typeof source[key] === "boolean" ? source[key] : void 0;
			const customButtons = Array.isArray(source.customButtons) && source.customButtons.length <= 9 ? source.customButtons.flatMap((value) => {
				if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
				const button = value;
				if (typeof button.text !== "string" || button.text.trim() === "" || button.text.length > 200 || typeof button.result !== "number" || !Number.isFinite(button.result)) return [];
				return [{
					text: button.text,
					result: button.result
				}];
			}) : void 0;
			const rows = Number.isSafeInteger(source.rows) && Number(source.rows) >= 1 && Number(source.rows) <= 20 ? Number(source.rows) : void 0;
			const okButton = label("okButton");
			const cancelButton = label("cancelButton");
			const placeholder = text("placeholder");
			const tooltip = text("tooltip");
			const wide = flag("wide");
			const wider = flag("wider");
			const large = flag("large");
			const leftAlign = flag("leftAlign");
			const allowEscapeClose = flag("allowEscapeClose");
			return {
				...okButton === void 0 ? {} : { okButton },
				...cancelButton === void 0 ? {} : { cancelButton },
				...rows === void 0 ? {} : { rows },
				...placeholder === void 0 ? {} : { placeholder },
				...tooltip === void 0 ? {} : { tooltip },
				...wide === void 0 ? {} : { wide },
				...wider === void 0 ? {} : { wider },
				...large === void 0 ? {} : { large },
				...leftAlign === void 0 ? {} : { leftAlign },
				...allowEscapeClose === void 0 ? {} : { allowEscapeClose },
				...customButtons === void 0 ? {} : { customButtons }
			};
		}
		function TavernScriptPopup({ request, onResolve }) {
			const [input, setInput] = (0, react.useState)(request.inputValue);
			const options = request.options;
			const canDismiss = options.allowEscapeClose !== false;
			const inputRows = options.rows ?? 1;
			const sanitized = purify.sanitize(request.content, {
				FORBID_ATTR: ["srcdoc", "style"],
				FORBID_TAGS: [
					"base",
					"button",
					"embed",
					"form",
					"iframe",
					"input",
					"link",
					"meta",
					"object",
					"script",
					"textarea"
				],
				USE_PROFILES: { html: true }
			});
			const affirmative = () => {
				onResolve(request.type === 3 ? input : 1);
			};
			const showOk = options.okButton !== false && request.type !== 4;
			const showCancel = options.cancelButton !== false && (request.type === 2 || request.type === 3) || typeof options.cancelButton === "string";
			const okLabel = typeof options.okButton === "string" ? options.okButton : request.type === 3 ? "保存" : request.type === 2 ? "确定" : "知道了";
			const cancelLabel = typeof options.cancelButton === "string" ? options.cancelButton : "取消";
			const buttonStyle = {
				background: "transparent",
				border: "1px solid var(--dsw-alias-border-l2, #4a4c54)",
				borderRadius: "8px",
				color: "inherit",
				cursor: "pointer",
				font: "inherit",
				fontSize: "12px",
				padding: "7px 12px"
			};
			(0, react.useEffect)(() => {
				if (!canDismiss) return;
				const close = (event) => {
					if (event.key === "Escape") onResolve(null);
				};
				window.addEventListener("keydown", close);
				return () => {
					window.removeEventListener("keydown", close);
				};
			}, [canDismiss, onResolve]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "dialog",
				"aria-modal": true,
				"aria-label": `${request.scriptName} 的酒馆脚本弹窗`,
				style: {
					alignItems: "center",
					background: "rgba(0,0,0,.72)",
					display: "flex",
					inset: 0,
					justifyContent: "center",
					padding: "18px",
					position: "fixed",
					zIndex: 1250
				},
				onMouseDown: (event) => {
					if (canDismiss && event.target === event.currentTarget) onResolve(null);
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: {
						background: "var(--dsw-alias-bg-base, #121318)",
						border: "1px solid var(--dsw-alias-border-l2, #3b3d45)",
						borderRadius: "14px",
						boxShadow: "0 22px 72px rgba(0,0,0,.5)",
						display: "grid",
						gap: "14px",
						maxHeight: "min(86vh, 840px)",
						maxWidth: options.wide || options.wider || options.large ? "960px" : "620px",
						overflow: "auto",
						padding: "16px",
						width: options.wide || options.wider || options.large ? "min(94vw, 960px)" : "min(92vw, 620px)"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							style: {
								alignItems: "center",
								display: "flex",
								gap: "10px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									flex: "1 1 auto",
									fontSize: "13px"
								},
								children: request.scriptName || "酒馆脚本"
							}), canDismiss && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "关闭弹窗",
								onClick: () => {
									onResolve(null);
								},
								style: {
									...buttonStyle,
									border: 0,
									fontSize: "20px",
									padding: "0 5px"
								},
								children: "×"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							title: options.tooltip,
							style: {
								fontSize: "13px",
								lineHeight: 1.65,
								overflowWrap: "anywhere",
								textAlign: options.leftAlign === false ? "center" : "left"
							},
							dangerouslySetInnerHTML: { __html: sanitized }
						}),
						request.type === 3 && (inputRows > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							autoFocus: true,
							rows: inputRows,
							value: input,
							placeholder: options.placeholder,
							onChange: (event) => {
								setInput(event.target.value);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
									event.preventDefault();
									affirmative();
								}
							},
							style: {
								background: "var(--dsw-alias-bg-elevated, #202228)",
								border: "1px solid var(--dsw-alias-border-l2, #4a4c54)",
								borderRadius: "8px",
								color: "inherit",
								font: "inherit",
								lineHeight: 1.5,
								maxHeight: "42vh",
								minHeight: "88px",
								padding: "9px",
								resize: "vertical"
							}
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							autoFocus: true,
							value: input,
							placeholder: options.placeholder,
							onChange: (event) => {
								setInput(event.target.value);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									affirmative();
								}
							},
							style: {
								background: "var(--dsw-alias-bg-elevated, #202228)",
								border: "1px solid var(--dsw-alias-border-l2, #4a4c54)",
								borderRadius: "8px",
								color: "inherit",
								font: "inherit",
								padding: "9px"
							}
						})),
						(showOk || showCancel || (options.customButtons?.length ?? 0) > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							style: {
								display: "flex",
								flexWrap: "wrap",
								gap: "8px",
								justifyContent: "flex-end"
							},
							children: [
								options.customButtons?.map((button, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										onResolve(button.result);
									},
									style: buttonStyle,
									children: button.text
								}, `${button.result}:${index}`)),
								showCancel && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										onResolve(request.type === 3 ? false : 0);
									},
									style: buttonStyle,
									children: cancelLabel
								}),
								showOk && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: affirmative,
									style: {
										...buttonStyle,
										background: "var(--dsw-alias-primary-bg, #3568d4)",
										borderColor: "transparent",
										color: "white"
									},
									children: okLabel
								})
							]
						})
					]
				})
			});
		}
		function TavernScriptToast({ toast, onClose }) {
			const closeRef = (0, react.useRef)(onClose);
			closeRef.current = onClose;
			(0, react.useEffect)(() => {
				const timer = window.setTimeout(() => {
					closeRef.current();
				}, 6e3);
				return () => {
					window.clearTimeout(timer);
				};
			}, [toast.id]);
			const accent = toast.level === "error" ? "#d76868" : toast.level === "warning" ? "#d5a64c" : toast.level === "success" ? "#58ad7b" : "#6d94dc";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onClose,
				title: "点击关闭",
				style: {
					background: "var(--dsw-alias-bg-elevated, #202228)",
					border: `1px solid color-mix(in srgb, ${accent} 58%, transparent)`,
					borderLeft: `4px solid ${accent}`,
					borderRadius: "10px",
					boxShadow: "0 12px 34px rgba(0,0,0,.3)",
					color: "inherit",
					cursor: "pointer",
					display: "grid",
					font: "inherit",
					gap: "3px",
					maxWidth: "min(92vw, 420px)",
					padding: "10px 12px",
					textAlign: "left",
					width: "100%"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: "10px",
						opacity: .58
					},
					children: toast.scriptName || "酒馆脚本"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: "12px",
						lineHeight: 1.45,
						overflowWrap: "anywhere",
						whiteSpace: "pre-wrap"
					},
					children: toast.value
				})]
			});
		}
		function TavernScriptRuntime({ ctx, inputActions, onDisplayOverride, projection, runGeneration, runModelList, runMutation, runPresetConfiguration, runPromptPreview, runTrigger, sessionId }) {
			const scripts = [
				...activeTavernScripts(projection, "global"),
				...activeTavernScripts(projection, "preset"),
				...activeTavernScripts(projection, "character")
			].filter((script) => script.enabled && script.content.trim() !== "");
			const [approvedOrigins, setApprovedOrigins] = (0, react.useState)(readApprovedTavernScriptOrigins);
			const scriptOrigins = [.../* @__PURE__ */ new Set([...BUILT_IN_TAVERN_SCRIPT_ORIGINS, ...approvedOrigins])].sort();
			const signature = `${scripts.map((script) => JSON.stringify(script)).join("")}\u0002${scriptOrigins.join("")}`;
			const [frames, setFrames] = (0, react.useState)([]);
			const [readyScriptIds, setReadyScriptIds] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [runtimeErrors, setRuntimeErrors] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [runtimeButtons, setRuntimeButtons] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [externalScriptRequests, setExternalScriptRequests] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [approvedGenerations, setApprovedGenerations] = (0, react.useState)(readApprovedTavernScriptGenerations);
			const [generationRequests, setGenerationRequests] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [approvedCustomGenerations, setApprovedCustomGenerations] = (0, react.useState)(readApprovedTavernScriptCustomGenerations);
			const [customGenerationRequests, setCustomGenerationRequests] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [approvedModels, setApprovedModels] = (0, react.useState)(readApprovedTavernScriptModels);
			const [modelListRequests, setModelListRequests] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [surfaceScriptIds, setSurfaceScriptIds] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [panelOpen, setPanelOpen] = (0, react.useState)(false);
			const [panelScriptId, setPanelScriptId] = (0, react.useState)();
			const [popupRequests, setPopupRequests] = (0, react.useState)([]);
			const [runtimeToasts, setRuntimeToasts] = (0, react.useState)([]);
			const toastSequence = (0, react.useRef)(0);
			const frameRefs = (0, react.useRef)(/* @__PURE__ */ new Map());
			const generationQueue = (0, react.useRef)(/* @__PURE__ */ new Map());
			const customGenerationQueue = (0, react.useRef)(/* @__PURE__ */ new Map());
			const activeGenerations = (0, react.useRef)(/* @__PURE__ */ new Map());
			const modelListQueue = (0, react.useRef)(/* @__PURE__ */ new Map());
			const projectionRef = (0, react.useRef)(projection);
			const mutationQueue = (0, react.useRef)(Promise.resolve());
			const presetRevisionRef = (0, react.useRef)(projection.preset?.revision ?? 0);
			const presetSessionRef = (0, react.useRef)(sessionId);
			projectionRef.current = projection;
			if (presetSessionRef.current !== sessionId) {
				presetSessionRef.current = sessionId;
				presetRevisionRef.current = projection.preset?.revision ?? 0;
			}
			if ((projection.preset?.revision ?? 0) > presetRevisionRef.current) presetRevisionRef.current = projection.preset?.revision ?? 0;
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				setFrames([]);
				setReadyScriptIds(/* @__PURE__ */ new Set());
				setRuntimeErrors(/* @__PURE__ */ new Map());
				setRuntimeButtons(/* @__PURE__ */ new Map());
				setExternalScriptRequests(/* @__PURE__ */ new Map());
				generationQueue.current.clear();
				setGenerationRequests(/* @__PURE__ */ new Map());
				customGenerationQueue.current.clear();
				setCustomGenerationRequests(/* @__PURE__ */ new Map());
				for (const active of activeGenerations.current.values()) active.controller.abort();
				activeGenerations.current.clear();
				modelListQueue.current.clear();
				setModelListRequests(/* @__PURE__ */ new Map());
				setSurfaceScriptIds(/* @__PURE__ */ new Set());
				setPopupRequests([]);
				setRuntimeToasts([]);
				Promise.all(scripts.map(async (script) => {
					try {
						const execution = await resolveTavernScriptExecution(script.content, controller.signal, scriptOrigins);
						return {
							script,
							source: execution.source,
							srcDoc: tavernScriptFrameSource(script, execution, tavernScriptSnapshot(projectionRef.current, script, scriptOrigins, sessionId))
						};
					} catch (reason) {
						return {
							script,
							error: reason instanceof Error ? reason.message : String(reason),
							...reason instanceof TavernScriptOriginApprovalError ? { requestedOrigin: reason.origin } : {}
						};
					}
				})).then((result) => {
					if (controller.signal.aborted) return;
					setFrames(result);
					setExternalScriptRequests(new Map(result.flatMap((entry) => entry.requestedOrigin === void 0 ? [] : [[entry.script.id, entry.requestedOrigin]])));
				});
				return () => {
					controller.abort();
					for (const active of activeGenerations.current.values()) active.controller.abort();
					activeGenerations.current.clear();
				};
			}, [sessionId, signature]);
			const syncFrame = (frame, script) => {
				const snapshot = tavernScriptSnapshot(projectionRef.current, script, scriptOrigins, sessionId);
				frame.contentWindow?.postMessage({
					source: "dsh-agent-rp-host",
					action: "variables-sync",
					scopes: snapshot.scopes,
					messages: snapshot.messages,
					characterRegexScripts: snapshot.characterRegexScripts,
					globalScriptTrees: snapshot.globalScriptTrees,
					presetScriptTrees: snapshot.presetScriptTrees,
					characterScriptTrees: snapshot.characterScriptTrees,
					injectedPrompts: snapshot.injectedPrompts,
					displayRegexScripts: snapshot.displayRegexScripts,
					worldbooks: snapshot.worldbooks,
					worldbookBindings: snapshot.worldbookBindings,
					activeWorldbookEntries: snapshot.activeWorldbookEntries,
					preset: snapshot.preset
				}, "*");
			};
			const broadcast = (message, except) => {
				for (const frame of frameRefs.current.values()) if (frame.contentWindow !== except) frame.contentWindow?.postMessage({
					source: "dsh-agent-rp-host",
					...message
				}, "*");
			};
			const generationApprovalKey = (scriptId) => [
				projectionRef.current.tavern?.characterSourceId ?? "unknown-character",
				projectionRef.current.tavern?.presetSourceId ?? "no-preset",
				scriptId
			].join("\0");
			const modelApprovalKey = (scriptId, origin) => [
				projectionRef.current.tavern?.characterSourceId ?? "unknown-character",
				projectionRef.current.tavern?.presetSourceId ?? "no-preset",
				scriptId,
				origin
			].join("\0");
			const customGenerationApprovalKey = (scriptId, origin) => [
				projectionRef.current.tavern?.characterSourceId ?? "unknown-character",
				projectionRef.current.tavern?.presetSourceId ?? "no-preset",
				scriptId,
				origin
			].join("\0");
			const executeGeneration = (scriptId, target, requestId, mode, config) => {
				const key = `${scriptId}\u0000${requestId}`;
				const controller = new AbortController();
				const generationId = typeof config.generation_id === "string" ? config.generation_id : void 0;
				activeGenerations.current.set(key, {
					target,
					...generationId === void 0 ? {} : { generationId },
					controller
				});
				mutationQueue.current.then(() => runGeneration(sessionId, {
					mode,
					config
				}, controller.signal)).then((value) => {
					target.postMessage({
						source: "dsh-agent-rp-host",
						action: "generation-result",
						requestId,
						ok: true,
						value
					}, "*");
				}).catch((reason) => {
					target.postMessage({
						source: "dsh-agent-rp-host",
						action: "generation-result",
						requestId,
						ok: false,
						error: reason instanceof Error ? reason.message : String(reason)
					}, "*");
				}).finally(() => {
					activeGenerations.current.delete(key);
				});
			};
			const executePromptPreview = (scriptId, target, requestId, mode, config) => {
				const key = `${scriptId}\u0000preview:${requestId}`;
				const controller = new AbortController();
				const generationId = typeof config.generation_id === "string" ? config.generation_id : void 0;
				activeGenerations.current.set(key, {
					target,
					...generationId === void 0 ? {} : { generationId },
					controller
				});
				mutationQueue.current.then(() => runPromptPreview(sessionId, {
					mode,
					config
				}, controller.signal)).then((value) => {
					target.postMessage({
						source: "dsh-agent-rp-host",
						action: "generation-preview-result",
						requestId,
						ok: true,
						value
					}, "*");
				}).catch((reason) => {
					target.postMessage({
						source: "dsh-agent-rp-host",
						action: "generation-preview-result",
						requestId,
						ok: false,
						error: reason instanceof Error ? reason.message : String(reason)
					}, "*");
				}).finally(() => {
					activeGenerations.current.delete(key);
				});
			};
			const executeModelList = (target, requestId, apiurl, key) => {
				runModelList({
					apiurl,
					...key === void 0 ? {} : { key }
				}).then((models) => {
					target.postMessage({
						source: "dsh-agent-rp-host",
						action: "model-list-result",
						requestId,
						ok: true,
						value: models
					}, "*");
				}).catch((reason) => {
					target.postMessage({
						source: "dsh-agent-rp-host",
						action: "model-list-result",
						requestId,
						ok: false,
						error: reason instanceof Error ? reason.message : String(reason)
					}, "*");
				});
			};
			const cancelGenerations = (scriptId, target, generationId) => {
				const matches = (request) => request.target === target && (generationId === void 0 || request.generationId === generationId);
				const reject = (request) => {
					request.target.postMessage({
						source: "dsh-agent-rp-host",
						action: "generation-result",
						requestId: request.requestId,
						ok: false,
						error: "酒馆脚本生成已取消"
					}, "*");
				};
				const localQueue = generationQueue.current.get(scriptId) ?? [];
				const localCancelled = localQueue.filter(matches);
				const localRemaining = localQueue.filter((request) => !matches(request));
				for (const request of localCancelled) reject(request);
				if (localRemaining.length === 0) generationQueue.current.delete(scriptId);
				else generationQueue.current.set(scriptId, localRemaining);
				if (localCancelled.length > 0) setGenerationRequests((current) => {
					const next = new Map(current);
					if (localRemaining.length === 0) next.delete(scriptId);
					else next.set(scriptId, localRemaining.length);
					return next;
				});
				const changedCustom = /* @__PURE__ */ new Map();
				for (const [approvalKey, queue] of customGenerationQueue.current) {
					const cancelled = queue.filter(matches);
					if (cancelled.length === 0) continue;
					const remaining = queue.filter((request) => !matches(request));
					for (const request of cancelled) reject(request);
					if (remaining.length === 0) customGenerationQueue.current.delete(approvalKey);
					else customGenerationQueue.current.set(approvalKey, remaining);
					changedCustom.set(approvalKey, remaining.length);
				}
				if (changedCustom.size > 0) setCustomGenerationRequests((current) => {
					const next = new Map(current);
					for (const [approvalKey, count] of changedCustom) {
						const existing = next.get(approvalKey);
						if (count === 0 || existing === void 0) next.delete(approvalKey);
						else next.set(approvalKey, {
							...existing,
							count
						});
					}
					return next;
				});
				for (const active of activeGenerations.current.values()) if (active.target === target && (generationId === void 0 || active.generationId === generationId)) active.controller.abort();
			};
			(0, react.useEffect)(() => {
				for (const entry of frames) {
					const frame = frameRefs.current.get(entry.script.id);
					if (frame !== void 0) syncFrame(frame, entry.script);
				}
			}, [
				projection.frontend,
				projection.mvu,
				projection.preset,
				projection.tavern
			]);
			const previousMvu = (0, react.useRef)();
			(0, react.useEffect)(() => {
				const current = projection.mvu === void 0 ? void 0 : JSON.stringify({ stat_data: projection.mvu.statData });
				const previous = previousMvu.current;
				previousMvu.current = {
					sessionId,
					...current === void 0 ? {} : { value: current }
				};
				if (previous === void 0 || previous.sessionId !== sessionId) return;
				const before = previous.value;
				if (current === void 0 || current === before) return;
				const currentValue = JSON.parse(current);
				if (before === void 0) {
					broadcast({
						action: "event",
						eventType: "mag_variable_initialized",
						args: [currentValue, 0]
					});
					broadcast({
						action: "event",
						eventType: "mag_variable_initiailized",
						args: [currentValue, 0]
					});
					return;
				}
				const beforeValue = JSON.parse(before);
				broadcast({
					action: "event",
					eventType: "mag_variable_update_ended",
					args: [currentValue, beforeValue]
				});
			}, [projection.mvu, sessionId]);
			const transcript = (0, react.useRef)({
				sessionId,
				cursor: void 0
			});
			(0, react.useEffect)(() => {
				const messages = projection.tavern?.messages ?? [];
				const advanced = advanceTavernTranscript(transcript.current.sessionId === sessionId ? transcript.current.cursor : void 0, messages);
				transcript.current = {
					sessionId,
					cursor: advanced.cursor
				};
				for (const message of advanced.appended) {
					if (message.role === "user") {
						broadcast({
							action: "event",
							eventType: "message_sent",
							args: [message.messageId]
						});
						continue;
					}
					broadcast({
						action: "event",
						eventType: "message_received",
						args: [message.messageId, "normal"]
					});
					broadcast({
						action: "event",
						eventType: "generation_ended",
						args: [message.messageId]
					});
				}
			}, [projection.tavern?.messages, sessionId]);
			(0, react.useEffect)(() => {
				const bridge = (event) => {
					const entry = frames.find((candidate) => frameRefs.current.get(candidate.script.id)?.contentWindow === event.source);
					if (entry === void 0 || typeof event.data !== "object" || event.data === null) return;
					const message = event.data;
					if (message.source !== "dsh-agent-rp-tavern-script") return;
					if (message.action === "ready") {
						setReadyScriptIds((current) => new Set(current).add(entry.script.id));
						setRuntimeErrors((current) => {
							if (!current.has(entry.script.id)) return current;
							const next = new Map(current);
							next.delete(entry.script.id);
							return next;
						});
						const frame = frameRefs.current.get(entry.script.id);
						if (frame === void 0) return;
						syncFrame(frame, entry.script);
						frame.contentWindow?.postMessage({
							source: "dsh-agent-rp-host",
							action: "script-buttons-request"
						}, "*");
						frame.contentWindow?.postMessage({
							source: "dsh-agent-rp-host",
							action: "event",
							eventType: "app_ready",
							args: []
						}, "*");
						frame.contentWindow?.postMessage({
							source: "dsh-agent-rp-host",
							action: "event",
							eventType: "chat_id_changed",
							args: [String(sessionId)]
						}, "*");
						if (projectionRef.current.mvu !== void 0) {
							frame.contentWindow?.postMessage({
								source: "dsh-agent-rp-host",
								action: "event",
								eventType: "mag_variable_initialized",
								args: [{ stat_data: projectionRef.current.mvu.statData }, 0]
							}, "*");
							frame.contentWindow?.postMessage({
								source: "dsh-agent-rp-host",
								action: "event",
								eventType: "mag_variable_initiailized",
								args: [{ stat_data: projectionRef.current.mvu.statData }, 0]
							}, "*");
						}
						return;
					}
					if (message.action === "runtime-error") {
						const detail = String(message.value);
						setRuntimeErrors((current) => new Map(current).set(entry.script.id, detail));
						ctx.logger.warn(`agent-rp: Tavern Helper script ${JSON.stringify(entry.script.name)} failed: ${detail}`);
						return;
					}
					if (message.action === "toast" && (message.level === "info" || message.level === "success" || message.level === "warning" || message.level === "error") && typeof message.value === "string" && message.value.trim() !== "" && message.value.length <= 8e3) {
						const toast = {
							id: ++toastSequence.current,
							scriptName: entry.script.name,
							level: message.level,
							value: message.value
						};
						setRuntimeToasts((current) => [...current, toast].slice(-4));
						return;
					}
					if (message.action === "script-buttons") {
						const buttons = runtimeScriptButtons(message.buttons);
						if (buttons !== void 0) setRuntimeButtons((current) => new Map(current).set(entry.script.id, buttons));
						return;
					}
					if (message.action === "display-override" && Number.isSafeInteger(message.messageId) && typeof message.value === "string" && message.value.length <= 2 * 1024 * 1024) {
						const messageId = message.messageId;
						if (messageId >= 0 && messageId < (projectionRef.current.tavern?.messages.length ?? 0)) onDisplayOverride(entry.script.id, messageId, message.value);
						return;
					}
					if (message.action === "surface" && typeof message.visible === "boolean") {
						setSurfaceScriptIds((current) => {
							if (current.has(entry.script.id) === message.visible) return current;
							const next = new Set(current);
							if (message.visible) next.add(entry.script.id);
							else next.delete(entry.script.id);
							return next;
						});
						return;
					}
					if (message.action === "external-script-request") {
						const origin = normalizedTavernScriptOrigin(message.origin);
						if (origin !== void 0 && !approvedOrigins.has(origin)) setExternalScriptRequests((current) => new Map(current).set(entry.script.id, origin));
						return;
					}
					if (message.action === "extension-settings-save") {
						const target = event.source;
						try {
							const settings = writeTavernExtensionSettings(window.localStorage, message.settings);
							broadcast({
								action: "extension-settings-sync",
								settings
							}, target);
							if (typeof message.requestId === "string") target.postMessage({
								source: "dsh-agent-rp-host",
								action: "settings-result",
								requestId: message.requestId,
								ok: true
							}, "*");
						} catch (reason) {
							const error = reason instanceof Error ? reason.message : String(reason);
							target.postMessage(typeof message.requestId === "string" ? {
								source: "dsh-agent-rp-host",
								action: "settings-result",
								requestId: message.requestId,
								ok: false,
								error
							} : {
								source: "dsh-agent-rp-host",
								action: "settings-error",
								error
							}, "*");
						}
						return;
					}
					if (message.action === "storage-request" && typeof message.requestId === "string" && typeof message.namespace === "string" && (message.operation === "get" || message.operation === "set" || message.operation === "remove" || message.operation === "clear" || message.operation === "keys" || message.operation === "length" || message.operation === "key")) {
						const target = event.source;
						executeTavernStorageRequest({
							operation: message.operation,
							namespace: message.namespace,
							...message.key === void 0 ? {} : { key: String(message.key) },
							...message.value === void 0 ? {} : { value: message.value },
							...message.index === void 0 ? {} : { index: Number(message.index) }
						}).then((value) => {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "storage-result",
								requestId: message.requestId,
								ok: true,
								value
							}, "*");
						}).catch((reason) => {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "storage-result",
								requestId: message.requestId,
								ok: false,
								error: reason instanceof Error ? reason.message : String(reason)
							}, "*");
						});
						return;
					}
					if (message.action === "popup-request" && typeof message.requestId === "string" && (message.popupType === 1 || message.popupType === 2 || message.popupType === 3 || message.popupType === 4) && typeof message.content === "string" && message.content.length <= 262144 && typeof message.inputValue === "string" && message.inputValue.length <= 65536) {
						const target = event.source;
						const request = {
							key: `${entry.script.id}:${message.requestId}`,
							target,
							requestId: message.requestId,
							scriptName: entry.script.name,
							type: message.popupType,
							content: message.content,
							inputValue: message.inputValue,
							options: runtimePopupOptions(message.options)
						};
						setPopupRequests((current) => {
							if (current.some((candidate) => candidate.key === request.key)) {
								target.postMessage({
									source: "dsh-agent-rp-host",
									action: "popup-result",
									requestId: request.requestId,
									ok: false,
									error: "弹窗请求标识重复"
								}, "*");
								return current;
							}
							if (current.length >= 20) {
								target.postMessage({
									source: "dsh-agent-rp-host",
									action: "popup-result",
									requestId: request.requestId,
									ok: false,
									error: "等待处理的酒馆脚本弹窗过多"
								}, "*");
								return current;
							}
							return [...current, request];
						});
						return;
					}
					if (message.action === "generation-cancel" && typeof message.generationId === "string") {
						cancelGenerations(entry.script.id, event.source, message.generationId);
						return;
					}
					if (message.action === "generation-cancel-all") {
						cancelGenerations(entry.script.id, event.source);
						return;
					}
					if (message.action === "generation-preview" && typeof message.requestId === "string" && (message.mode === "preset" || message.mode === "raw") && typeof message.config === "object" && message.config !== null && !Array.isArray(message.config)) {
						executePromptPreview(entry.script.id, event.source, message.requestId, message.mode, message.config);
						return;
					}
					if (message.action === "generate" && typeof message.requestId === "string" && (message.mode === "preset" || message.mode === "raw") && typeof message.config === "object" && message.config !== null && !Array.isArray(message.config)) {
						const target = event.source;
						const config = message.config;
						const request = {
							target,
							requestId: message.requestId,
							mode: message.mode,
							config,
							...typeof config.generation_id === "string" ? { generationId: config.generation_id } : {}
						};
						const customApi = request.config.custom_api;
						if (customApi !== void 0) {
							if (typeof customApi !== "object" || customApi === null || Array.isArray(customApi)) {
								target.postMessage({
									source: "dsh-agent-rp-host",
									action: "generation-result",
									requestId: request.requestId,
									ok: false,
									error: "custom_api 必须是对象"
								}, "*");
								return;
							}
							const apiurl = customApi.apiurl;
							const origin = normalizedTavernModelOrigin(apiurl);
							if (origin === void 0) {
								target.postMessage({
									source: "dsh-agent-rp-host",
									action: "generation-result",
									requestId: request.requestId,
									ok: false,
									error: typeof apiurl === "string" ? "API 地址只支持 HTTP 或 HTTPS" : "custom_api.apiurl 不能为空"
								}, "*");
								return;
							}
							const approvalKey = customGenerationApprovalKey(entry.script.id, origin);
							if (approvedCustomGenerations.has(approvalKey)) executeGeneration(entry.script.id, target, request.requestId, request.mode, request.config);
							else {
								const queued = customGenerationQueue.current.get(approvalKey) ?? [];
								queued.push(request);
								customGenerationQueue.current.set(approvalKey, queued);
								setCustomGenerationRequests((current) => new Map(current).set(approvalKey, {
									scriptId: entry.script.id,
									origin,
									count: queued.length
								}));
							}
							return;
						}
						if (approvedGenerations.has(generationApprovalKey(entry.script.id))) executeGeneration(entry.script.id, target, request.requestId, request.mode, request.config);
						else {
							const queued = generationQueue.current.get(entry.script.id) ?? [];
							queued.push(request);
							generationQueue.current.set(entry.script.id, queued);
							setGenerationRequests((current) => new Map(current).set(entry.script.id, queued.length));
						}
						return;
					}
					if (message.action === "model-list" && typeof message.requestId === "string" && typeof message.apiurl === "string" && message.apiurl.length <= 2048 && (message.key === void 0 || typeof message.key === "string" && message.key.length <= 8192)) {
						const target = event.source;
						const origin = normalizedTavernModelOrigin(message.apiurl);
						if (origin === void 0) {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "model-list-result",
								requestId: message.requestId,
								ok: false,
								error: "API 地址只支持 HTTP 或 HTTPS"
							}, "*");
							return;
						}
						const approvalKey = modelApprovalKey(entry.script.id, origin);
						const request = {
							target,
							requestId: message.requestId,
							apiurl: message.apiurl,
							...message.key === void 0 ? {} : { key: message.key }
						};
						if (approvedModels.has(approvalKey)) executeModelList(target, request.requestId, request.apiurl, request.key);
						else {
							const queued = modelListQueue.current.get(approvalKey) ?? [];
							queued.push(request);
							modelListQueue.current.set(approvalKey, queued);
							setModelListRequests((current) => new Map(current).set(approvalKey, {
								scriptId: entry.script.id,
								origin,
								count: queued.length
							}));
						}
						return;
					}
					if (message.action === "event-emit" && typeof message.eventType === "string" && Array.isArray(message.args)) {
						broadcast({
							action: "event",
							eventType: message.eventType,
							args: message.args
						}, event.source);
						return;
					}
					if (message.action === "injections-replace" && typeof message.requestId === "string" && Array.isArray(message.prompts)) {
						const target = event.source;
						const request = {
							format: 0,
							operation: "replace-script-injections",
							scriptId: entry.script.id,
							prompts: message.prompts
						};
						mutationQueue.current = mutationQueue.current.then(() => runMutation(sessionId, request)).then(() => {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "variables-result",
								requestId: message.requestId,
								ok: true
							}, "*");
						}).catch((reason) => {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "variables-result",
								requestId: message.requestId,
								ok: false,
								error: reason instanceof Error ? reason.message : String(reason)
							}, "*");
						});
						return;
					}
					if (message.action === "trigger-slash" && typeof message.requestId === "string" && typeof message.value === "string" && message.value.length <= 65536) {
						const target = event.source;
						const resolve = () => {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "variables-result",
								requestId: message.requestId,
								ok: true
							}, "*");
						};
						const reject = (reason) => {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "variables-result",
								requestId: message.requestId,
								ok: false,
								error: reason instanceof Error ? reason.message : String(reason)
							}, "*");
						};
						const command = parseTavernSlashCommand(message.value);
						if (command?.kind === "set-input" && !command.trigger) {
							inputActions.setDraft(command.text);
							resolve();
							return;
						}
						if (command?.kind === "send" || command?.kind === "set-input") {
							const conversation = ctx.sessions.scope(sessionId)?.get("conversation");
							if (conversation === void 0) reject(/* @__PURE__ */ new Error("当前角色会话尚未准备好发送消息"));
							else mutationQueue.current.then(() => conversation.send(command.text)).then(resolve, reject);
							return;
						}
						if (command?.kind === "trigger") {
							mutationQueue.current.then(() => runTrigger(sessionId)).then(resolve, reject);
							return;
						}
						const visibility = message.value.match(/^\/(hide|unhide)\s+(\d+)(?:-(\d+))?\s*$/iu);
						if (visibility?.[1] !== void 0 && visibility[2] !== void 0) {
							const start = Number(visibility[2]);
							const end = Number(visibility[3] ?? visibility[2]);
							const request = {
								format: 0,
								operation: "set-chat-hidden",
								start: Math.min(start, end),
								end: Math.max(start, end),
								hidden: visibility[1].toLowerCase() === "hide"
							};
							mutationQueue.current = mutationQueue.current.then(() => runMutation(sessionId, request)).then(resolve, reject);
							return;
						}
						reject(/* @__PURE__ */ new Error(`当前不支持酒馆命令：${message.value.split(/\s/u, 1)[0] ?? message.value}`));
						return;
					}
					if (message.action === "preset-replace" && typeof message.requestId === "string") {
						const target = event.source;
						mutationQueue.current = mutationQueue.current.then(async () => {
							const revision = presetRevisionRef.current;
							await runPresetConfiguration(sessionId, tavernPresetConfiguration(projectionRef.current, message.preset, revision));
							presetRevisionRef.current = revision + 1;
							const current = currentTavernPreset(projectionRef.current);
							broadcast({
								action: "preset-sync",
								preset: current === void 0 ? void 0 : {
									...current,
									revision: presetRevisionRef.current,
									value: message.preset
								}
							}, target);
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "preset-result",
								requestId: message.requestId,
								ok: true
							}, "*");
						}).catch((reason) => {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "preset-result",
								requestId: message.requestId,
								ok: false,
								error: reason instanceof Error ? reason.message : String(reason)
							}, "*");
						});
						return;
					}
					if ((message.action === "worldbook-mutate" || message.action === "chat-mutate") && typeof message.requestId === "string" && typeof message.request === "object" && message.request !== null && !Array.isArray(message.request)) {
						const target = event.source;
						const request = message.request;
						mutationQueue.current = mutationQueue.current.then(() => runMutation(sessionId, request)).then(() => {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "variables-result",
								requestId: message.requestId,
								ok: true
							}, "*");
						}).catch((reason) => {
							target.postMessage({
								source: "dsh-agent-rp-host",
								action: "variables-result",
								requestId: message.requestId,
								ok: false,
								error: reason instanceof Error ? reason.message : String(reason)
							}, "*");
						});
						return;
					}
					if (message.action !== "variables-replace" || typeof message.requestId !== "string" || message.scope !== "global" && message.scope !== "preset" && message.scope !== "character" && message.scope !== "chat" && message.scope !== "message" && message.scope !== "script" || typeof message.variables !== "object" || message.variables === null || Array.isArray(message.variables)) return;
					const target = event.source;
					const request = {
						format: 0,
						scope: message.scope,
						...message.scope === "script" ? { scriptId: entry.script.id } : {},
						variables: message.variables
					};
					mutationQueue.current = mutationQueue.current.then(() => runMutation(sessionId, request)).then(() => {
						target.postMessage({
							source: "dsh-agent-rp-host",
							action: "variables-result",
							requestId: message.requestId,
							ok: true
						}, "*");
					}).catch((reason) => {
						target.postMessage({
							source: "dsh-agent-rp-host",
							action: "variables-result",
							requestId: message.requestId,
							ok: false,
							error: reason instanceof Error ? reason.message : String(reason)
						}, "*");
					});
				};
				window.addEventListener("message", bridge);
				return () => {
					window.removeEventListener("message", bridge);
				};
			}, [
				approvedCustomGenerations,
				approvedGenerations,
				approvedModels,
				frames,
				inputActions,
				onDisplayOverride,
				runGeneration,
				runModelList,
				runMutation,
				runPresetConfiguration,
				runPromptPreview,
				runTrigger,
				sessionId
			]);
			if (scripts.length === 0) return null;
			const failures = frames.flatMap((entry) => {
				const error = entry.error ?? runtimeErrors.get(entry.script.id);
				return error === void 0 ? [] : [{
					script: entry.script,
					error
				}];
			});
			const buttons = scripts.flatMap((script) => script.buttonEnabled ? (runtimeButtons.get(script.id) ?? script.buttons).filter((button) => button.visible).map((button) => ({
				script,
				button
			})) : []);
			const panelFrames = frames.filter((entry) => entry.srcDoc !== void 0 && surfaceScriptIds.has(entry.script.id));
			const activePanelScriptId = panelFrames.some((entry) => entry.script.id === panelScriptId) ? panelScriptId : panelFrames[0]?.script.id;
			const activePopup = popupRequests[0];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				runtimeToasts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"aria-live": "polite",
					style: {
						display: "grid",
						gap: "8px",
						position: "fixed",
						right: "14px",
						top: "14px",
						width: "min(92vw, 420px)",
						zIndex: 1230
					},
					children: runtimeToasts.map((toast) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TavernScriptToast, {
						toast,
						onClose: () => {
							setRuntimeToasts((current) => current.filter((message) => message.id !== toast.id));
						}
					}, toast.id))
				}),
				activePopup !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TavernScriptPopup, {
					request: activePopup,
					onResolve: (value) => {
						activePopup.target.postMessage({
							source: "dsh-agent-rp-host",
							action: "popup-result",
							requestId: activePopup.requestId,
							ok: true,
							value
						}, "*");
						setPopupRequests((current) => current.filter((request) => request.key !== activePopup.key));
					}
				}, activePopup.key),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "agent-rp-tavern-script-overlay",
					"data-agent-rp-dialog": true,
					"aria-hidden": !panelOpen,
					...panelOpen ? {
						role: "dialog",
						"aria-modal": true,
						"aria-label": "酒馆脚本面板"
					} : {},
					style: panelOpen ? {
						alignItems: "center",
						background: "rgba(0,0,0,.68)",
						display: "flex",
						inset: 0,
						justifyContent: "center",
						padding: "20px",
						position: "fixed",
						zIndex: 1100
					} : {
						height: "1px",
						left: "-10000px",
						opacity: 0,
						overflow: "hidden",
						pointerEvents: "none",
						position: "fixed",
						top: 0,
						width: "1px"
					},
					onMouseDown: (event) => {
						if (panelOpen && event.target === event.currentTarget) setPanelOpen(false);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "agent-rp-tavern-script-dialog",
						style: panelOpen ? {
							background: "var(--dsw-alias-bg-base, #111216)",
							border: "1px solid var(--dsw-alias-border-l2, #35373d)",
							borderRadius: "14px",
							boxShadow: "0 20px 64px rgba(0,0,0,.45)",
							display: "flex",
							flexDirection: "column",
							height: "min(82vh, 760px)",
							maxWidth: "1120px",
							overflow: "hidden",
							width: "min(94vw, 1120px)"
						} : { display: "contents" },
						children: [
							panelOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								style: {
									alignItems: "center",
									borderBottom: "1px solid var(--dsw-alias-border-l2, #35373d)",
									display: "flex",
									gap: "8px",
									padding: "10px 12px"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
										style: {
											fontSize: "13px",
											marginRight: "4px"
										},
										children: "酒馆脚本"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											display: "flex",
											flex: "1 1 auto",
											gap: "6px",
											minWidth: 0,
											overflowX: "auto"
										},
										children: panelFrames.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												setPanelScriptId(entry.script.id);
											},
											style: {
												background: entry.script.id === activePanelScriptId ? "var(--dsw-alias-bg-elevated, #2a2c32)" : "transparent",
												border: "1px solid var(--dsw-alias-border-l2, #41434a)",
												borderRadius: "7px",
												color: "inherit",
												cursor: "pointer",
												flex: "0 0 auto",
												font: "inherit",
												fontSize: "11px",
												maxWidth: "240px",
												overflow: "hidden",
												padding: "5px 8px",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: entry.script.name || "未命名脚本"
										}, entry.script.id))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											flex: "0 0 auto",
											fontSize: "11px",
											opacity: .58
										},
										children: [
											readyScriptIds.size,
											"/",
											scripts.length,
											" 已启动"
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "关闭酒馆脚本面板",
										onClick: () => {
											setPanelOpen(false);
										},
										style: {
											background: "transparent",
											border: 0,
											color: "inherit",
											cursor: "pointer",
											fontSize: "20px",
											padding: "2px 6px"
										},
										children: "×"
									})
								]
							}),
							frames.flatMap((entry) => entry.source === void 0 || entry.srcDoc === void 0 ? [] : [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
								title: entry.script.name || "酒馆脚本",
								"data-agent-rp-tavern-script": entry.script.id,
								sandbox: "allow-scripts",
								srcDoc: entry.srcDoc,
								style: panelOpen ? {
									background: "transparent",
									border: 0,
									display: entry.script.id === activePanelScriptId ? "block" : "none",
									flex: "1 1 auto",
									minHeight: 0,
									width: "100%"
								} : {
									border: 0,
									height: "1px",
									width: "1px"
								},
								ref: (frame) => {
									if (frame === null) frameRefs.current.delete(entry.script.id);
									else frameRefs.current.set(entry.script.id, frame);
								}
							}, entry.script.id)]),
							panelOpen && panelFrames.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									alignItems: "center",
									display: "flex",
									flex: "1 1 auto",
									justifyContent: "center",
									minHeight: 0,
									padding: "24px"
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										maxWidth: "520px",
										width: "100%"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										style: {
											fontSize: "13px",
											margin: "0 0 12px",
											opacity: .72
										},
										children: "这些脚本在后台运行，没有单独界面。"
									}), frames.map((entry) => {
										const error = entry.error ?? runtimeErrors.get(entry.script.id);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												alignItems: "center",
												borderTop: "1px solid var(--dsw-alias-border-l2, #35373d)",
												display: "flex",
												gap: "10px",
												padding: "9px 2px"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													flex: "1 1 auto",
													minWidth: 0,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap"
												},
												children: entry.script.name || "未命名脚本"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													color: error === void 0 ? "inherit" : "var(--dsw-alias-state-warning, #d5a64c)",
													fontSize: "11px",
													opacity: .66
												},
												children: error === void 0 ? readyScriptIds.has(entry.script.id) ? "运行中" : "启动中" : "运行失败"
											})]
										}, entry.script.id);
									})]
								})
							}),
							panelOpen && frames.find((entry) => entry.script.id === activePanelScriptId)?.error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									margin: "auto",
									maxWidth: "720px",
									padding: "20px"
								},
								children: frames.find((entry) => entry.script.id === activePanelScriptId)?.error
							})
						]
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						setPanelOpen(true);
					},
					title: "打开隔离运行的酒馆脚本界面",
					style: {
						background: "transparent",
						border: "1px solid var(--dsw-alias-border-l2, #444)",
						borderRadius: "7px",
						color: "inherit",
						cursor: "pointer",
						font: "inherit",
						fontSize: "11px",
						opacity: .72,
						padding: "3px 7px"
					},
					children: [
						"脚本 ",
						readyScriptIds.size,
						"/",
						scripts.length
					]
				}),
				buttons.map(({ script, button }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: !readyScriptIds.has(script.id) || runtimeErrors.has(script.id),
					title: `${script.name} · ${button.name}`,
					onClick: () => {
						frameRefs.current.get(script.id)?.contentWindow?.postMessage({
							source: "dsh-agent-rp-host",
							action: "event",
							eventType: `${script.id}_${button.name}`,
							args: []
						}, "*");
					},
					style: {
						background: "transparent",
						border: "1px solid var(--dsw-alias-border-l2, #444)",
						borderRadius: "7px",
						color: "inherit",
						cursor: readyScriptIds.has(script.id) ? "pointer" : "wait",
						font: "inherit",
						fontSize: "11px",
						opacity: readyScriptIds.has(script.id) ? .72 : .4,
						padding: "3px 7px"
					},
					children: button.name
				}, `${script.id}:${button.name}`)),
				[...externalScriptRequests].map(([scriptId, origin]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					title: `允许隔离脚本从 ${origin} 加载 JavaScript`,
					onClick: () => {
						const next = new Set(approvedOrigins);
						next.add(origin);
						writeApprovedTavernScriptOrigins(next);
						setApprovedOrigins(next);
					},
					style: {
						background: "transparent",
						border: "1px solid var(--dsw-alias-state-warning, #9f7934)",
						borderRadius: "7px",
						color: "inherit",
						cursor: "pointer",
						font: "inherit",
						fontSize: "11px",
						opacity: .78,
						padding: "3px 7px"
					},
					children: ["允许 ", new URL(origin).hostname]
				}, `${scriptId}:${origin}`)),
				[...generationRequests].map(([scriptId, count]) => {
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						title: "允许这个隔离脚本使用当前 DSH 模型生成文本；生成会消耗模型额度",
						onClick: () => {
							const next = new Set(approvedGenerations);
							next.add(generationApprovalKey(scriptId));
							writeApprovedTavernScriptGenerations(next);
							setApprovedGenerations(next);
							const queued = generationQueue.current.get(scriptId) ?? [];
							generationQueue.current.delete(scriptId);
							setGenerationRequests((current) => {
								const remaining = new Map(current);
								remaining.delete(scriptId);
								return remaining;
							});
							for (const request of queued) executeGeneration(scriptId, request.target, request.requestId, request.mode, request.config);
						},
						style: {
							background: "transparent",
							border: "1px solid var(--dsw-alias-state-warning, #9f7934)",
							borderRadius: "7px",
							color: "inherit",
							cursor: "pointer",
							font: "inherit",
							fontSize: "11px",
							opacity: .78,
							padding: "3px 7px"
						},
						children: [
							"允许 ",
							scripts.find((entry) => entry.id === scriptId)?.name || "脚本",
							" 调用模型",
							count > 1 ? ` (${count})` : ""
						]
					}, `generation:${scriptId}`);
				}),
				[...customGenerationRequests].map(([approvalKey, request]) => {
					const script = scripts.find((entry) => entry.id === request.scriptId);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						title: `允许这个隔离脚本连接 ${request.origin} 并生成文本；生成会消耗该 API 的额度，密钥只转发给该地址`,
						onClick: () => {
							const next = new Set(approvedCustomGenerations);
							next.add(approvalKey);
							writeApprovedTavernScriptCustomGenerations(next);
							setApprovedCustomGenerations(next);
							const queued = customGenerationQueue.current.get(approvalKey) ?? [];
							customGenerationQueue.current.delete(approvalKey);
							setCustomGenerationRequests((current) => {
								const remaining = new Map(current);
								remaining.delete(approvalKey);
								return remaining;
							});
							for (const item of queued) executeGeneration(request.scriptId, item.target, item.requestId, item.mode, item.config);
						},
						style: {
							background: "transparent",
							border: "1px solid var(--dsw-alias-state-warning, #9f7934)",
							borderRadius: "7px",
							color: "inherit",
							cursor: "pointer",
							font: "inherit",
							fontSize: "11px",
							opacity: .78,
							padding: "3px 7px"
						},
						children: [
							"允许 ",
							script?.name || "脚本",
							" 使用 ",
							new URL(request.origin).hostname,
							" 生成",
							request.count > 1 ? ` (${request.count})` : ""
						]
					}, `custom-generation:${approvalKey}`);
				}),
				[...modelListRequests].map(([approvalKey, request]) => {
					const script = scripts.find((entry) => entry.id === request.scriptId);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						title: `允许这个隔离脚本连接 ${request.origin} 并读取模型名称；API 密钥只转发给该地址`,
						onClick: () => {
							const next = new Set(approvedModels);
							next.add(approvalKey);
							writeApprovedTavernScriptModels(next);
							setApprovedModels(next);
							const queued = modelListQueue.current.get(approvalKey) ?? [];
							modelListQueue.current.delete(approvalKey);
							setModelListRequests((current) => {
								const remaining = new Map(current);
								remaining.delete(approvalKey);
								return remaining;
							});
							for (const item of queued) executeModelList(item.target, item.requestId, item.apiurl, item.key);
						},
						style: {
							background: "transparent",
							border: "1px solid var(--dsw-alias-state-warning, #9f7934)",
							borderRadius: "7px",
							color: "inherit",
							cursor: "pointer",
							font: "inherit",
							fontSize: "11px",
							opacity: .78,
							padding: "3px 7px"
						},
						children: [
							"允许 ",
							script?.name || "脚本",
							" 读取 ",
							new URL(request.origin).hostname,
							" 模型",
							request.count > 1 ? ` (${request.count})` : ""
						]
					}, `models:${approvalKey}`);
				}),
				(readyScriptIds.size < scripts.length || failures.length > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					title: failures.length === 0 ? "正在启动酒馆脚本" : failures.map((entry) => `${entry.script.name}：${entry.error}`).join("\n"),
					style: {
						color: "var(--dsw-alias-state-warning, #d5a64c)",
						fontSize: "11px",
						opacity: .72
					},
					children: [
						"脚本 ",
						readyScriptIds.size,
						"/",
						scripts.length
					]
				})
			] });
		}
		const chipStyle = {
			background: `color-mix(in srgb, ${color} 10%, transparent)`,
			borderRadius: "999px",
			color: "inherit",
			fontSize: "11px",
			opacity: .76,
			padding: "5px 9px"
		};
		function roleplayComposerDockComponent(ctx, runImageGeneration, runTavernMutation, runTavernGeneration, runTavernPromptPreview, runTavernModelList, runTavernTrigger, runPresetConfiguration) {
			return function RoleplayComposerDock({ inputActions, sessionId, useProjection, useSessions, useSession }) {
				const summary = useSessions((state) => state.byId[sessionId]);
				const projection = roleplaySummary(summary, useProjection("agentRp"));
				const chat = useSession((state) => state.chat);
				const viewMode = useRoleplayViewMode(sessionId);
				const [drawOpen, setDrawOpen] = (0, react.useState)(false);
				const [displayOverrides, setDisplayOverrides] = (0, react.useState)(() => /* @__PURE__ */ new Map());
				const rootRef = (0, react.useRef)(null);
				const characterDetail = useCharacterDetail(projection?.avatarLibraryId);
				const displayStateRef = (0, react.useRef)({
					chat,
					characterDetail,
					displayOverrides,
					projection,
					viewMode
				});
				const scanDisplayRef = (0, react.useRef)(() => void 0);
				displayStateRef.current = {
					chat,
					characterDetail,
					displayOverrides,
					projection,
					viewMode
				};
				const background = selectedBackground(characterDetail, useRoleplayBackground(sessionId));
				const placeholder = (projection === void 0 ? void 0 : roleplayDisplayName(summary, projection)) === void 0 ? void 0 : "写下你的回应…";
				const transcriptSignature = projection?.tavern?.messages.map((message) => `${message.seq}\u0000${message.text}`).join("");
				const onDisplayOverride = (0, react.useCallback)((_scriptId, messageId, value) => {
					setDisplayOverrides((current) => new Map(current).set(messageId, value));
				}, []);
				(0, react.useEffect)(() => {
					setDisplayOverrides(/* @__PURE__ */ new Map());
				}, [sessionId, transcriptSignature]);
				(0, react.useLayoutEffect)(() => {
					const scroll = rootRef.current?.closest("[data-conversation-scroll]");
					if (scroll == null || background === void 0 || projection?.avatarLibraryId === void 0 || viewMode !== "immersive") return;
					const previous = {
						attachment: scroll.style.getPropertyValue("background-attachment"),
						image: scroll.style.getPropertyValue("background-image"),
						position: scroll.style.getPropertyValue("background-position"),
						repeat: scroll.style.getPropertyValue("background-repeat"),
						size: scroll.style.getPropertyValue("background-size")
					};
					scroll.dataset.agentRpBackground = "true";
					scroll.style.setProperty("background-attachment", "local");
					scroll.style.setProperty("background-image", `linear-gradient(rgba(10,11,15,.76),rgba(10,11,15,.88)),url("${characterLibraryImageUrl(projection.avatarLibraryId, background.index)}")`);
					scroll.style.setProperty("background-position", "center");
					scroll.style.setProperty("background-repeat", "no-repeat");
					scroll.style.setProperty("background-size", "cover");
					return () => {
						delete scroll.dataset.agentRpBackground;
						for (const [property, value] of Object.entries(previous)) {
							const cssProperty = `background-${property === "image" ? "image" : property}`;
							if (value === "") scroll.style.removeProperty(cssProperty);
							else scroll.style.setProperty(cssProperty, value);
						}
					};
				}, [
					background?.index,
					projection?.avatarLibraryId,
					viewMode
				]);
				(0, react.useLayoutEffect)(() => {
					const dock = rootRef.current?.closest("[data-slot=\"conversation.composer.dock\"]");
					const inputRoot = dock?.parentElement;
					if (dock == null || inputRoot == null || placeholder === void 0) return;
					const managedTextareas = /* @__PURE__ */ new Map();
					const hiddenControls = /* @__PURE__ */ new Map();
					const hide = (element) => {
						if (!(element instanceof HTMLElement) || hiddenControls.has(element)) return;
						hiddenControls.set(element, {
							display: element.style.getPropertyValue("display"),
							priority: element.style.getPropertyPriority("display")
						});
						element.style.setProperty("display", "none", "important");
					};
					const refreshComposer = () => {
						const card = inputRoot.querySelector("[data-composer-card]");
						const textarea = card?.querySelector("textarea");
						if (textarea != null) {
							if (!managedTextareas.has(textarea)) managedTextareas.set(textarea, textarea.getAttribute("placeholder"));
							if (textarea.getAttribute("placeholder") !== placeholder) textarea.setAttribute("placeholder", placeholder);
						}
						if (viewMode === "debug") return;
						const row = card?.lastElementChild;
						const tools = row?.firstElementChild;
						const trailing = row?.lastElementChild;
						for (const element of Array.from(tools?.children ?? [])) hide(element);
						for (const element of Array.from(trailing?.children ?? [])) if (element.tagName !== "BUTTON") hide(element);
						for (const element of Array.from(inputRoot.children)) if (element !== card && element !== dock) hide(element);
					};
					if (viewMode !== "debug") dock.dataset.agentRpInput = "";
					refreshComposer();
					const observer = new MutationObserver(refreshComposer);
					observer.observe(inputRoot, {
						attributeFilter: ["placeholder"],
						attributes: true,
						childList: true,
						subtree: true
					});
					return () => {
						observer.disconnect();
						for (const [element, { display, priority }] of hiddenControls) if (display === "") element.style.removeProperty("display");
						else element.style.setProperty("display", display, priority);
						delete dock.dataset.agentRpInput;
						for (const [textarea, previousPlaceholder] of managedTextareas) {
							if (textarea.getAttribute("placeholder") !== placeholder) continue;
							if (previousPlaceholder === null) textarea.removeAttribute("placeholder");
							else textarea.setAttribute("placeholder", previousPlaceholder);
						}
					};
				}, [placeholder, viewMode]);
				(0, react.useEffect)(() => {
					if (projection === void 0) return;
					const scroll = rootRef.current?.closest("[data-conversation-scroll]");
					if (scroll == null) return;
					const mounted = /* @__PURE__ */ new Map();
					const hiddenTranscriptDetails = /* @__PURE__ */ new Map();
					const legacyConversationNotices = /* @__PURE__ */ new Set();
					const hideTranscriptDetail = (element) => {
						if (hiddenTranscriptDetails.has(element)) return;
						hiddenTranscriptDetails.set(element, {
							display: element.style.getPropertyValue("display"),
							priority: element.style.getPropertyPriority("display")
						});
						element.style.setProperty("display", "none", "important");
					};
					const restoreTranscriptDetail = (element) => {
						const previous = hiddenTranscriptDetails.get(element);
						if (previous === void 0) return;
						if (previous.display === "") element.style.removeProperty("display");
						else element.style.setProperty("display", previous.display, previous.priority);
						hiddenTranscriptDetails.delete(element);
					};
					const showLegacyConversationNotice = (item) => {
						if (item.dataset.agentRpLegacyConversation === "true") return;
						const notice = document.createElement("aside");
						notice.setAttribute("role", "status");
						notice.style.cssText = "border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:10px;margin:8px 0;padding:12px 14px;font-size:13px;line-height:1.6;opacity:.76;";
						notice.textContent = "这段会话由早期预览版创建，当前版本无法继续读取它的轮次记录。原会话仍保留；请从标题栏打开“角色库”，选择对应角色后开始新对话。";
						item.before(notice);
						item.dataset.agentRpLegacyConversation = "true";
						legacyConversationNotices.add(notice);
						hideTranscriptDetail(item);
					};
					const bridge = (event) => {
						const sourceFrame = [...mounted.keys()].flatMap((root) => [...root.querySelectorAll("iframe[data-agent-rp-frame]")]).find((frame) => frame.contentWindow === event.source);
						if (sourceFrame == null || typeof event.data !== "object" || event.data === null) return;
						const message = event.data;
						if (message.source !== "dsh-agent-rp-card") return;
						if (message.action === "resize" && typeof message.value === "number" && Number.isFinite(message.value)) {
							sourceFrame.style.height = `${Math.max(72, Math.ceil(message.value))}px`;
							sourceFrame.style.visibility = "visible";
							return;
						}
						if (typeof message.value !== "string" || message.value.length > 65536) return;
						if (message.action === "draft") {
							inputActions.setDraft(message.value);
							return;
						}
						if (message.action !== "trigger-slash") return;
						const command = parseTavernSlashCommand(message.value);
						if (command?.kind === "set-input" && !command.trigger) {
							inputActions.setDraft(command.text);
							return;
						}
						if (command?.kind === "trigger") {
							runTavernTrigger(sessionId).catch((reason) => {
								ctx.logger.warn(`agent-rp: Tavern /trigger failed: ${String(reason)}`);
							});
							return;
						}
						if (command?.kind !== "send" && command?.kind !== "set-input") return;
						(ctx.sessions.scope(sessionId)?.get("conversation"))?.send(command.text);
					};
					const mountRenderedDisplay = (item, original, compilation, activeProjection, activeCharacterDetail) => {
						const existing = item.querySelector(":scope > [data-agent-rp-rendered-display]");
						const signature = JSON.stringify([
							compilation,
							activeProjection.mvu?.statData,
							activeProjection.characterName,
							activeCharacterDetail?.id,
							activeCharacterDetail?.imageAssets,
							activeCharacterDetail?.displayExtensions.filter((extension) => extension.enabled),
							activeCharacterDetail?.approvedRemoteResourceOrigins
						]);
						const existingMount = existing === null ? void 0 : mounted.get(existing);
						if (existing !== null && existingMount !== void 0) {
							if (existingMount.signature === signature) return;
							existingMount.signature = signature;
							existingMount.root.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterDisplay, {
								compilation,
								statData: activeProjection.mvu?.statData,
								characterName: activeProjection.characterName,
								...activeCharacterDetail === void 0 ? {} : { character: activeCharacterDetail }
							}));
							return;
						}
						const display = document.createElement("div");
						display.style.cssText = "display:block;min-width:0;width:100%;";
						display.dataset.agentRpRenderedDisplay = "true";
						original.style.display = "none";
						item.dataset.agentRpFrontend = "true";
						item.insertBefore(display, original.nextSibling);
						const root = (0, react_dom_client.createRoot)(display);
						mounted.set(display, {
							root,
							signature
						});
						root.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CharacterDisplay, {
							compilation,
							statData: activeProjection.mvu?.statData,
							characterName: activeProjection.characterName,
							...activeCharacterDetail === void 0 ? {} : { character: activeCharacterDetail }
						}));
					};
					window.addEventListener("message", bridge);
					const scan = () => {
						const { chat: activeChat, characterDetail: activeCharacterDetail, displayOverrides: activeDisplayOverrides, projection: activeProjection, viewMode: activeViewMode } = displayStateRef.current;
						if (activeProjection === void 0) return;
						if (activeProjection.avatarLibraryId !== void 0 && activeCharacterDetail === void 0) return;
						const frontend = activeProjection.frontend;
						const hasDisplayRules = activeViewMode === "immersive" && frontend !== void 0 && frontend.regexScripts.length + (activeProjection.preset?.regexScripts.length ?? 0) > 0;
						const messageIdBySeq = new Map(activeProjection.tavern?.messages.map((message) => [message.seq, message.messageId]));
						const tavernMessageBySeq = new Map(activeProjection.tavern?.messages.map((message) => [message.seq, message]));
						if (activeViewMode === "immersive") {
							for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"context\"], [data-chat-flow-kind=\"tool-call\"], [data-chat-flow-kind=\"manual-compaction\"], [data-chat-flow-kind=\"compaction\"], [data-chat-flow-kind=\"model-retry\"], [data-chat-flow-kind=\"unknown\"]")) hideTranscriptDetail(item);
							for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"command\"]")) if (item.querySelector("[data-agent-rp-image-card]") === null) hideTranscriptDetail(item);
							else restoreTranscriptDetail(item);
							for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"turn-error\"]")) {
								if (item.textContent?.includes("agent-rp/character-card-seed has invalid provenance")) {
									hideTranscriptDetail(item);
									continue;
								}
								if (!item.textContent?.includes("received more than one start Match") || item.dataset.agentRpLegacyConversation === "true") continue;
								showLegacyConversationNotice(item);
							}
							for (const item of scroll.querySelectorAll("[data-chat-flow] > div")) {
								if (!item.textContent?.startsWith("历史加载失败：conversation Context") || !item.textContent.includes("received more than one start Match")) continue;
								showLegacyConversationNotice(item);
							}
							for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"user\"]")) {
								if (item.dataset.agentRpSetupCollapsed === "true" || !item.textContent?.includes("🎬 档案提交完毕指令：")) continue;
								const content = item.firstElementChild;
								if (content === null) continue;
								const details = document.createElement("details");
								details.style.cssText = "font-size:12px;opacity:.72;";
								const summaryElement = document.createElement("summary");
								summaryElement.textContent = "角色设定已提交";
								summaryElement.style.cssText = "cursor:pointer;list-style:none;";
								const original = content.cloneNode(true);
								original.style.cssText = "margin-top:8px;max-height:240px;overflow:auto;white-space:pre-wrap;";
								details.append(summaryElement, original);
								content.style.display = "none";
								item.insertBefore(details, content.nextSibling);
								item.dataset.agentRpSetupCollapsed = "true";
							}
						}
						for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"user\"]")) {
							const key = item.dataset.chatFlowKey;
							if (key === void 0) continue;
							const node = activeChat.nodes.get(key);
							if (node?.kind !== "user") continue;
							const seq = node.data.seq;
							const messageId = messageIdBySeq.get(seq);
							const override = messageId === void 0 ? void 0 : activeDisplayOverrides.get(messageId);
							const original = item.firstElementChild;
							if (original === null) continue;
							if (override !== void 0) {
								mountRenderedDisplay(item, original, {
									segments: [{
										kind: "html",
										source: override
									}],
									diagnostics: []
								}, activeProjection, activeCharacterDetail);
								continue;
							}
							const message = tavernMessageBySeq.get(seq);
							if (!hasDisplayRules || frontend === void 0 || message?.role !== "user" || message.text === "") continue;
							const depth = Math.max(0, activeChat.order.length - activeChat.order.indexOf(key) - 1);
							const rendered = renderCharacterDisplay(message.text, {
								name: activeProjection.characterName,
								frontend
							}, 1, depth, activeProjection.userName, activeProjection.preset?.regexScripts);
							if (rendered === message.text) continue;
							mountRenderedDisplay(item, original, compileCharacterDisplay(rendered), activeProjection, activeCharacterDetail);
						}
						for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"assistant-step\"]")) {
							const key = item.dataset.chatFlowKey;
							if (key === void 0) continue;
							const node = activeChat.nodes.get(key);
							if (node?.kind !== "assistant-step") continue;
							const data = node.data;
							const finalSeq = node.data.finalNode?.seq;
							const generation = finalSeq === void 0 ? void 0 : activeProjection.generations.find((group) => group.assistantSeqs.includes(finalSeq));
							const selected = generation?.versions.find((version) => version.seq === generation.selectedVersionSeq);
							const messageId = (selected === void 0 ? void 0 : messageIdBySeq.get(selected.seq)) ?? (finalSeq === void 0 ? void 0 : messageIdBySeq.get(finalSeq));
							const override = messageId === void 0 ? void 0 : activeDisplayOverrides.get(messageId);
							const original = item.firstElementChild;
							if (override !== void 0 && original !== null) {
								mountRenderedDisplay(item, original, {
									segments: [{
										kind: "html",
										source: override
									}],
									diagnostics: []
								}, activeProjection, activeCharacterDetail);
								continue;
							}
							if (activeViewMode === "immersive" && generation !== void 0) {
								if (finalSeq !== generation.anchorSeq) {
									hideTranscriptDetail(item);
									continue;
								}
								if (selected !== void 0 && original !== null) {
									const rendered = renderCharacterDisplay(selected.text.replaceAll(statusPlaceholder, ""), {
										name: activeProjection.characterName,
										frontend: activeProjection.frontend ?? {
											regexScripts: [],
											tavernHelperScriptNames: [],
											tavernHelperScripts: [],
											tavernHelperVariables: {}
										}
									}, 2, 0, activeProjection.userName, activeProjection.preset?.regexScripts);
									mountRenderedDisplay(item, original, compileCharacterDisplay(rendered), activeProjection, activeCharacterDetail);
									continue;
								}
							}
							if (item.dataset.agentRpFrontend === "true") continue;
							if (activeViewMode === "immersive") for (const element of item.querySelectorAll("[data-variant=\"think\"]")) hideTranscriptDetail(element);
							if (!hasDisplayRules || frontend === void 0) continue;
							const raw = data.blocks?.flatMap((block) => block.kind === "text" && block.text !== void 0 ? [block.text] : []).join("\n") ?? "";
							if (raw === "") continue;
							const depth = Math.max(0, activeChat.order.length - activeChat.order.indexOf(key) - 1);
							const rendered = renderCharacterDisplay(raw.replaceAll(statusPlaceholder, ""), {
								name: activeProjection.characterName,
								frontend
							}, 2, depth, activeProjection.userName, activeProjection.preset?.regexScripts);
							if (rendered === raw) continue;
							if (original === null) continue;
							mountRenderedDisplay(item, original, compileCharacterDisplay(rendered), activeProjection, activeCharacterDetail);
						}
						if (activeViewMode === "immersive") for (const item of scroll.querySelectorAll("[data-chat-flow-kind=\"turn-tail\"]")) {
							const key = item.dataset.chatFlowKey;
							const node = key === void 0 ? void 0 : activeChat.nodes.get(key);
							if (node?.kind !== "turn-tail") continue;
							const seq = node.data.closing?.finalNode?.seq;
							if (seq !== void 0 && activeProjection.generations.some((group) => group.assistantSeqs.includes(seq) && seq !== group.anchorSeq)) hideTranscriptDetail(item);
						}
					};
					let scanFrame;
					const scheduleScan = () => {
						if (scanFrame !== void 0) return;
						scanFrame = window.requestAnimationFrame(() => {
							scanFrame = void 0;
							scan();
						});
					};
					scanDisplayRef.current = scheduleScan;
					scan();
					const observer = new MutationObserver(scheduleScan);
					observer.observe(scroll, {
						childList: true,
						subtree: true
					});
					return () => {
						observer.disconnect();
						if (scanFrame !== void 0) window.cancelAnimationFrame(scanFrame);
						scanDisplayRef.current = () => void 0;
						window.removeEventListener("message", bridge);
						for (const [display, { root }] of mounted) {
							const item = display.closest("[data-agent-rp-frontend]");
							const original = item?.firstElementChild;
							if (original !== null) original.style.removeProperty("display");
							if (item !== null) delete item.dataset.agentRpFrontend;
							root.unmount();
							display.remove();
						}
						for (const [element, { display, priority }] of hiddenTranscriptDetails) {
							if (display === "") element.style.removeProperty("display");
							else element.style.setProperty("display", display, priority);
							delete element.dataset.agentRpLegacyConversation;
						}
						for (const notice of legacyConversationNotices) notice.remove();
						for (const item of scroll.querySelectorAll("[data-agent-rp-setup-collapsed=\"true\"]")) {
							item.firstElementChild?.style.removeProperty("display");
							item.querySelector(":scope > details")?.remove();
							delete item.dataset.agentRpSetupCollapsed;
						}
					};
				}, [
					sessionId,
					viewMode,
					projection !== void 0
				]);
				(0, react.useEffect)(() => {
					scanDisplayRef.current();
				}, [
					chat,
					characterDetail,
					displayOverrides,
					projection
				]);
				if (projection === void 0) return null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: rootRef,
					"data-agent-rp-status": true,
					style: {
						alignItems: "center",
						display: "flex",
						gap: "4px",
						minWidth: 0
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TavernScriptRuntime, {
							ctx,
							inputActions,
							onDisplayOverride,
							projection,
							runGeneration: runTavernGeneration,
							runModelList: runTavernModelList,
							runMutation: runTavernMutation,
							runPresetConfiguration,
							runPromptPreview: runTavernPromptPreview,
							runTrigger: runTavernTrigger,
							sessionId
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-label": "生成聊天插图",
							title: "生成聊天插图",
							onClick: () => {
								setDrawOpen(true);
							},
							style: {
								alignItems: "center",
								background: "transparent",
								border: 0,
								borderRadius: "7px",
								color: "inherit",
								cursor: "pointer",
								display: "inline-flex",
								flex: "0 0 auto",
								font: "inherit",
								fontSize: "11px",
								gap: "4px",
								opacity: .62,
								padding: "3px 7px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: { color },
								children: "✦"
							}), "绘图"]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoleplayStatusLine, {
							projection: summary?.title?.trim() && summary.title.trim() !== projection.characterName ? {
								...projection,
								characterName: summary.title.trim()
							} : projection,
							running: useSession((state) => state.running)
						}),
						drawOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageGenerationDialog, {
							projection,
							onClose: () => {
								setDrawOpen(false);
							},
							onGenerate: (request) => {
								runImageGeneration(sessionId, request);
							}
						})
					]
				});
			};
		}
		function RoleplayStatusLine({ projection, running }) {
			const parts = [
				projection.userName === void 0 ? void 0 : `你是 ${projection.userName}`,
				projection.worldInfoCount === 0 ? void 0 : `世界书 ${projection.worldInfoCount} 条`,
				projection.importedMessageCount === 0 ? void 0 : `已迁移 ${projection.importedMessageCount} 条历史`
			].filter((part) => part !== void 0);
			if (!running && parts.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					alignItems: "center",
					display: "flex",
					fontSize: "11px",
					gap: "8px",
					minHeight: "18px",
					opacity: .5,
					padding: "0 10px"
				},
				children: [
					running && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [projection.characterName, "正在回应"] }),
					running && parts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "·" }),
					parts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: parts.join(" · ") })
				]
			});
		}
		const hintStyle = {
			alignItems: "center",
			background: `color-mix(in srgb, ${color} 8%, transparent)`,
			border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
			borderRadius: "10px",
			display: "flex",
			flexWrap: "wrap",
			gap: "10px",
			padding: "9px 12px"
		};
		const markStyle = {
			alignItems: "center",
			background: `color-mix(in srgb, ${color} 16%, transparent)`,
			borderRadius: "8px",
			display: "flex",
			flex: "0 0 30px",
			fontSize: "16px",
			height: "30px",
			justifyContent: "center"
		};
		const actionStyle = {
			background: `color-mix(in srgb, ${color} 12%, transparent)`,
			border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
			borderRadius: "7px",
			color: "inherit",
			cursor: "pointer",
			font: "inherit",
			fontSize: "12px",
			padding: "5px 9px"
		};
		function importHintComponent(ctx, migrateDraft, listPresets) {
			return function SillyTavernImportHint({ input, inputActions, sessionId }) {
				const [busy, setBusy] = (0, react.useState)(false);
				const [error, setError] = (0, react.useState)();
				const summary = ctx.sessions.list.getSnapshot().byId[sessionId];
				const { entries: loadedPresets, error: presetError, presetId, selectPreset } = usePresetPreference(listPresets, summary?.agentPreset === "agent-rp");
				const presets = loadedPresets ?? [];
				if (summary?.agentPreset !== "agent-rp") return null;
				const conversation = ctx.sessions.scope(sessionId)?.get("conversation");
				const ids = [.../* @__PURE__ */ new Set([...input.attachmentIds ?? [], ...input.imageIds ?? []])];
				const draftAttachments = conversation?.draftAttachments;
				const attachments = typeof draftAttachments === "function" ? draftAttachments.call(conversation, ids) : [];
				const selected = selectSillyTavernDraft(attachments);
				if (selected === void 0) return null;
				const blank = input.draft.trim() === "";
				const chat = selected.kind === "chat";
				const migration = selected.kind === "migration";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: hintStyle,
					role: "status",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: markStyle,
							"aria-hidden": "true",
							children: "↗"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								flex: "1 1 220px",
								minWidth: 0
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										fontSize: "13px",
										fontWeight: 600,
										lineHeight: 1.45
									},
									children: [migration ? "迁移角色与对话" : chat ? "导入历史对话" : selected.kind === "character-card" ? "识别到 CHARX 角色卡" : selected.kind === "json-resource" ? "识别到 JSON 资源" : "识别到 PNG 图片", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontWeight: 400,
											marginLeft: "6px",
											opacity: .72
										},
										children: selected.name
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: "12px",
										lineHeight: 1.45,
										marginTop: "2px",
										opacity: .62
									},
									children: migration ? "将创建一个角色会话，并保留原聊天历史" : chat ? "将从这份记录创建新的角色会话" : blank ? "请选择导入类型" : "发送后开始导入"
								}),
								(error ?? presetError) !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										color: "var(--dsw-alias-state-danger, #d64d5f)",
										fontSize: "12px",
										marginTop: "4px"
									},
									children: error ?? presetError
								})
							]
						}),
						(chat || migration) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "8px",
								marginLeft: "auto"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								"aria-label": "迁移对话预设",
								value: presetId,
								onChange: (event) => {
									selectPreset(event.target.value);
								},
								style: {
									background: "var(--dsw-alias-bg-layer-1, #202024)",
									border: "1px solid var(--dsw-alias-border-l2, #3b3b41)",
									borderRadius: "7px",
									color: "inherit",
									font: "inherit",
									fontSize: "11px",
									maxWidth: "150px",
									padding: "5px 7px"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: "不使用预设"
								}), presets.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: entry.id,
									children: presetLibraryOptionLabel(entry, presets)
								}, entry.id))]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: actionStyle,
								disabled: busy,
								onClick: () => {
									setBusy(true);
									setError(void 0);
									migrateDraft(sessionId, attachments, inputActions, presetId === "" ? void 0 : presetId).catch((reason) => {
										setError(reason instanceof Error ? reason.message : String(reason));
									}).finally(() => {
										setBusy(false);
									});
								},
								children: busy ? "正在迁移…" : migration ? "迁移" : "导入"
							})]
						}),
						!chat && !migration && blank && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								marginLeft: "auto"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: actionStyle,
									onClick: () => {
										inputActions.setDraft("请导入这张角色卡");
									},
									children: "角色卡"
								}),
								selected.kind === "json-resource" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: actionStyle,
									onClick: () => {
										inputActions.setDraft("请导入这本世界书");
									},
									children: "世界书"
								}),
								selected.kind === "json-resource" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: actionStyle,
									onClick: () => {
										inputActions.setDraft("请导入这份预设");
									},
									children: "预设"
								})
							]
						})
					]
				});
			};
		}
		function avatarLoader(ctx) {
			return async (attachmentId) => {
				const sessionId = ctx.sessions.list.getSnapshot().current;
				if (sessionId === void 0) return void 0;
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) return void 0;
				const result = await session.readAttachment(attachmentId);
				if (!result.ok) return void 0;
				const bytes = new Uint8Array(result.value.data).slice().buffer;
				const blob = new Blob([bytes], { type: result.value.attachment.mediaType });
				return URL.createObjectURL(blob);
			};
		}
		/** Client services required by the Roleplay shell. */
		const inject = [
			"connection",
			"slots",
			"sessions",
			"workspaces"
		];
		/** Register the Agent RP header, composer presentation, and import affordance. */
		function apply(ctx) {
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset.agentRpResponsive = "";
				style.textContent = agentRpResponsiveStyle;
				document.head.append(style);
				return () => {
					style.remove();
				};
			});
			const workspaceSettings = createWorkspaceSettingsSource();
			const workspaceList = {
				getSnapshot: () => ctx.workspaces.list.getSnapshot(),
				subscribe: (listener) => ctx.workspaces.list.subscribe(listener)
			};
			const loadAvatar = avatarLoader(ctx);
			const loadModelCapabilities = async (sessionId) => {
				const connection = ctx.get("connection");
				if (connection === void 0) throw new Error("当前客户端无法读取模型能力");
				const { result } = await connection.api.sessions.models({ sessionId });
				if (!result.ok) throw new Error(result.error.message);
				const provider = result.value.groups.find((group) => group.id === result.value.current.provider);
				const model = provider?.models.find((entry) => entry.id === result.value.current.model);
				return {
					current: result.value.current,
					...provider === void 0 ? {} : { providerName: provider.name },
					...model === void 0 ? {} : {
						modelName: model.name,
						reasoning: model.reasoning ?? { efforts: [] }
					}
				};
			};
			const renameSession = async (sessionId, title) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const result = await session.rename(title);
				if (!result.ok) throw new Error(result.error.message);
			};
			const exportChat = async (sessionId) => {
				const response = await fetch(`${SILLYTAVERN_CHAT_EXPORT_PATH}?sessionId=${encodeURIComponent(sessionId)}`, { headers: { accept: "application/x-ndjson, application/json" } });
				if (!response.ok) {
					const source = await response.text();
					let message;
					try {
						message = JSON.parse(source).error;
					} catch (_invalidJson) {
						message = void 0;
					}
					throw new Error(message ?? `聊天导出失败（${response.status}）`);
				}
				const encodedFilename = response.headers.get("x-agent-rp-filename");
				const filename = encodedFilename === null ? "Agent-RP-对话.jsonl" : decodeURIComponent(encodedFilename);
				const objectUrl = URL.createObjectURL(await response.blob());
				const link = document.createElement("a");
				try {
					link.href = objectUrl;
					link.download = filename;
					document.body.append(link);
					link.click();
				} finally {
					link.remove();
					window.setTimeout(() => {
						URL.revokeObjectURL(objectUrl);
					}, 0);
				}
			};
			const listMemory = async (sessionId) => {
				const response = await fetch(`${AGENT_RP_MEMORY_PATH}?sessionId=${encodeURIComponent(sessionId)}`, { headers: { accept: "application/json" } });
				const value = await response.json();
				if (!response.ok || value.format !== 0 || !Array.isArray(value.memories) || value.memories.some((memory) => typeof memory !== "object" || memory === null || typeof memory.id !== "string" || typeof memory.subject !== "string" || typeof memory.text !== "string" || ![
					"fact",
					"promise",
					"relationship",
					"preference",
					"event"
				].includes(memory.kind) || memory.source !== "character" && memory.source !== "user" && memory.source !== "inherited")) throw new Error(value.error ?? `记忆读取失败（${response.status}）`);
				return value.memories;
			};
			const manageMemory = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-memory ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用记忆管理");
			};
			const characterLibraryJson = async (path = "") => {
				const response = await fetch(`${CHARACTER_LIBRARY_PATH}${path}`, { headers: { accept: "application/json" } });
				const value = await response.json();
				if (!response.ok) throw new Error(value.error ?? `角色库请求失败（${response.status}）`);
				return value;
			};
			const listCharacters = async (collection = "active") => {
				return (await characterLibraryJson(collection === "active" ? "" : "?collection=archived")).entries;
			};
			const readCharacter = async (id) => {
				return (await characterLibraryJson(`/${encodeURIComponent(id)}`)).entry;
			};
			const setCharacterArchived = async (id, archived) => {
				const response = await fetch(`${CHARACTER_LIBRARY_PATH}/${encodeURIComponent(id)}/${archived ? "archive" : "restore"}`, {
					method: "POST",
					headers: { accept: "application/json" }
				});
				const value = await response.json();
				if (!response.ok || value.entry === void 0) throw new Error(value.error ?? `角色库请求失败（${response.status}）`);
				return value.entry;
			};
			const importCharacterFile = async (file) => {
				const response = await fetch(`${CHARACTER_LIBRARY_PATH}/import?filename=${encodeURIComponent(file.name)}`, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": file.type || "application/octet-stream"
					},
					body: file
				});
				const value = await response.json();
				if (!response.ok || value.entry === void 0 || value.outcome === void 0) throw new Error(value.error ?? `角色卡导入失败（${response.status}）`);
				return {
					entry: value.entry,
					outcome: value.outcome
				};
			};
			const launchRoleplaySession = async (request) => {
				const response = await fetch(AGENT_RP_SESSION_PATH, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify(request)
				});
				const responseText = await response.text();
				let value;
				try {
					value = JSON.parse(responseText);
				} catch {
					throw new Error(response.ok ? "Host 返回了无法识别的角色会话" : `角色会话创建失败（${response.status}）`);
				}
				if (!response.ok || value.sessionId === void 0) throw new Error(value.error ?? `角色会话创建失败（${response.status}）`);
				const sessionId = value.sessionId;
				await ctx.sessions.refresh();
				if (ctx.sessions.list.getSnapshot().byId[sessionId] === void 0) throw new Error("角色会话已创建，但客户端尚未收到它；请刷新页面后重试");
				ctx.sessions.open(sessionId);
				return sessionId;
			};
			const rewriteTurn = async (sourceSessionId, turn, draft) => {
				await launchRoleplaySession({
					format: 0,
					sourceSessionId,
					kind: "rewrite",
					turn,
					text: draft
				});
			};
			const continueFromTurn = async (sourceSessionId, atSeq) => {
				const sessionId = await ctx.sessions.fork({
					sessionId: sourceSessionId,
					atSeq,
					increaseTitle: true
				});
				ctx.sessions.open(sessionId);
			};
			const retainRpDistributionChat = async (target, sessionId) => {
				const response = await fetch(RP_DISTRIBUTION_BRIDGE_PATH, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify({
						format: 0,
						operation: "import-chat",
						target,
						sessionId
					})
				});
				const value = await response.json();
				if (!response.ok || value.format !== 0 || value.operation !== "import-chat" || typeof value.target !== "string" || typeof value.sourceSessionId !== "string" || typeof value.importId !== "string" || typeof value.filename !== "string" || typeof value.messageCount !== "number" || typeof value.characterName !== "string" || typeof value.userName !== "string") throw new Error(value.error ?? `模块化 RP 会话迁移失败（${response.status}）`);
				return value;
			};
			const startCharacterSession = async (sessionId, character, greetingIndex, persona, presetId, memory) => {
				await launchRoleplaySession({
					format: 0,
					sourceSessionId: sessionId,
					kind: "character",
					characterId: character.id,
					greetingIndex,
					...persona === void 0 ? {} : { persona },
					...presetId === void 0 ? {} : { presetId },
					...memory === void 0 ? {} : { memory }
				});
			};
			const archiveConsumedBlankSession = async (sessionId) => {
				if (ctx.sessions.list.getSnapshot().byId[sessionId]?.blank !== true) return;
				try {
					await ctx.workspaces.archiveSession(sessionId);
				} catch (reason) {
					ctx.logger.warn(`agent-rp: blank source Session ${JSON.stringify(sessionId)} remains visible: ${String(reason)}`);
				}
			};
			const startCharacterFromBlankSession = async (sessionId, character, greetingIndex, persona, presetId) => {
				const summary = ctx.sessions.list.getSnapshot().byId[sessionId];
				if (summary === void 0 || !summary.blank) throw new Error("只能从尚未开始的会话选择角色");
				await startCharacterSession(sessionId, character, greetingIndex, persona, presetId);
				await archiveConsumedBlankSession(sessionId);
			};
			const startCharacterFromCurrentSession = async (sessionId, character, greetingIndex, persona, presetId, memory) => {
				await startCharacterSession(sessionId, character, greetingIndex, persona, presetId, memory);
			};
			const migrateChat = async (sourceSessionId, chatFile, cardFile, presetId) => {
				if (!/\.jsonl$/iu.test(chatFile.name)) throw new Error("请选择 SillyTavern 导出的 JSONL 聊天记录");
				const character = cardFile === void 0 ? void 0 : await importCharacterFile(cardFile);
				const response = await fetch(`${SILLYTAVERN_CHAT_PATH}?filename=${encodeURIComponent(chatFile.name)}`, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": chatFile.type || "application/x-ndjson"
					},
					body: chatFile
				});
				const responseText = await response.text();
				let value;
				try {
					value = JSON.parse(responseText);
				} catch {
					throw new Error(response.ok ? "Host 返回了无法识别的聊天迁移结果" : `聊天记录上传失败（${response.status}）`);
				}
				if (!response.ok || value.upload === void 0) throw new Error(value.error ?? `聊天记录上传失败（${response.status}）`);
				await launchRoleplaySession({
					format: 0,
					sourceSessionId,
					kind: "chat",
					importId: value.upload.id,
					...character === void 0 ? {} : { characterId: character.entry.id },
					...presetId === void 0 ? {} : { presetId }
				});
			};
			const migrateRpDistributionChat = async (sourceSessionId, target, remoteSessionId, presetId) => {
				const imported = await retainRpDistributionChat(target, remoteSessionId);
				try {
					window.localStorage.setItem(RP_DISTRIBUTION_TARGET_KEY, imported.target);
				} catch {}
				await launchRoleplaySession({
					format: 0,
					sourceSessionId,
					kind: "chat",
					importId: imported.importId,
					...presetId === void 0 ? {} : { presetId }
				});
			};
			const migrateSillyTavernDraft = async (sourceSessionId, attachments, inputActions, presetId) => {
				const chatAttachment = attachments.find((attachment) => attachment.kind === "file" && /\.jsonl$/iu.test(attachment.file.name));
				if (chatAttachment === void 0) throw new Error("没有找到 JSONL 聊天记录");
				const cardAttachment = attachments.find((attachment) => attachment !== chatAttachment);
				await migrateChat(sourceSessionId, chatAttachment.file, cardAttachment?.file, presetId);
				const sourceConversation = ctx.sessions.scope(sourceSessionId)?.get("conversation");
				const actions = inputActions;
				for (const attachment of attachments) {
					actions.removeAttachment?.(attachment.id);
					actions.removeImage?.(attachment.id);
					sourceConversation?.releaseDraftAttachment?.(attachment.id);
				}
			};
			const migrateChatFromBlankSession = async (sourceSessionId, chatFile, cardFile, presetId) => {
				const summary = ctx.sessions.list.getSnapshot().byId[sourceSessionId];
				if (summary === void 0 || !summary.blank) throw new Error("只能从尚未开始的会话迁移聊天");
				await migrateChat(sourceSessionId, chatFile, cardFile, presetId);
				await archiveConsumedBlankSession(sourceSessionId);
			};
			const migrateRpDistributionChatFromBlankSession = async (sourceSessionId, target, remoteSessionId, presetId) => {
				const summary = ctx.sessions.list.getSnapshot().byId[sourceSessionId];
				if (summary === void 0 || !summary.blank) throw new Error("只能从尚未开始的会话迁移聊天");
				await migrateRpDistributionChat(sourceSessionId, target, remoteSessionId, presetId);
				await archiveConsumedBlankSession(sourceSessionId);
			};
			const personaLibraryJson = async (init) => {
				const response = await fetch(PERSONA_LIBRARY_PATH, init === void 0 ? { headers: { accept: "application/json" } } : {
					method: init.method,
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify(init.body)
				});
				const value = await response.json();
				if (!response.ok) throw new Error(value.error ?? `Persona 库请求失败（${response.status}）`);
				return value;
			};
			const listPersonas = async () => {
				return (await personaLibraryJson()).entries;
			};
			const listPresets = async () => {
				const response = await fetch(PRESET_LIBRARY_PATH, { headers: { accept: "application/json" } });
				const value = await response.json();
				if (!response.ok || value.entries === void 0) throw new Error(value.error ?? `预设库请求失败（${response.status}）`);
				return value.entries;
			};
			const listWorldInfos = async () => {
				const response = await fetch(WORLD_INFO_LIBRARY_PATH, { headers: { accept: "application/json" } });
				const value = await response.json();
				if (!response.ok || value.entries === void 0) throw new Error(value.error ?? `世界书来源读取失败（${response.status}）`);
				return value.entries;
			};
			const savePersona = async (request) => {
				return (await personaLibraryJson({
					method: "POST",
					body: request
				})).entry;
			};
			const deletePersona = async (id) => {
				const response = await fetch(`${PERSONA_LIBRARY_PATH}/${encodeURIComponent(id)}`, {
					method: "DELETE",
					headers: { accept: "application/json" }
				});
				const value = await response.json();
				if (!response.ok || value.entry === void 0) throw new Error(value.error ?? `Persona 移除失败（${response.status}）`);
				return value.entry;
			};
			const applyPersona = async (sessionId, persona) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-persona ${JSON.stringify({
					format: 0,
					...persona === void 0 ? {} : { persona }
				})}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用身份管理");
			};
			const importPresetFile = async (file) => {
				if (!/\.json$/iu.test(file.name)) throw new Error("请选择 SillyTavern 预设 JSON 文件");
				const response = await fetch(`${PRESET_LIBRARY_PATH}?filename=${encodeURIComponent(file.name)}`, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": file.type || "application/json"
					},
					body: file
				});
				const value = await response.json();
				if (!response.ok || value.entry === void 0) throw new Error(value.error ?? `预设导入失败（${response.status}）`);
				const entry = (await listPresets()).find((candidate) => candidate.id === value.entry?.id);
				if (entry === void 0) throw new Error("预设已导入，但预设库没有返回对应条目");
				return entry;
			};
			const importPreset = async (sessionId, file) => {
				const entry = await importPresetFile(file);
				await managePresetLibrary(sessionId, {
					operation: "select",
					id: entry.id
				});
			};
			const configurePreset = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-preset-configure ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用预设管理命令");
			};
			const managePresetLibrary = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-preset-library ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用预设库");
			};
			const configureWorldInfo = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-world-info ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用世界书管理");
			};
			const importWorldInfo = async (sessionId, file) => {
				if (!/\.json$/iu.test(file.name)) throw new Error("请选择 SillyTavern World Info JSON 文件");
				const response = await fetch(`${WORLD_INFO_LIBRARY_PATH}?filename=${encodeURIComponent(file.name)}`, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": file.type || "application/json"
					},
					body: file
				});
				const value = await response.json();
				if (!response.ok || value.upload === void 0) throw new Error(value.error ?? `世界书上传失败（${response.status}）`);
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const request = {
					format: 0,
					importId: value.upload.id
				};
				const result = await session.command(`/rp-world-info-import ${JSON.stringify(request)}`);
				if (!result.ok) throw new Error(result.error.message);
				if (!result.value.matched) throw new Error("当前 Host 未启用世界书导入");
			};
			const runGeneration = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-generation ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用回复版本控制");
			};
			const runImageGeneration = (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const jobId = `image-${crypto.randomUUID()}`;
				const payload = {
					format: 0,
					jobId,
					...request
				};
				session.command(`/rp-draw ${JSON.stringify(payload)}`).then((response) => {
					if (!response.ok) throw new Error(response.error.message);
					if (!response.value.matched) throw new Error("当前 Host 未启用聊天绘图");
				}).catch((reason) => {
					ctx.logger.warn(`agent-rp: image command ${JSON.stringify(jobId)} failed: ${String(reason)}`);
				});
				return jobId;
			};
			const runTavernMutation = async (sessionId, request) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command(`/rp-tavern-variables ${JSON.stringify(request)}`);
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用酒馆脚本变量桥");
			};
			const runTavernTrigger = async (sessionId) => {
				const scope = ctx.sessions.scope(sessionId);
				const session = scope === void 0 ? void 0 : ctx.sessions.sessionOf(scope);
				if (session === void 0) throw new Error("当前角色会话不可用");
				const response = await session.command("/rp-tavern-trigger");
				if (!response.ok) throw new Error(response.error.message);
				if (!response.value.matched) throw new Error("当前 Host 未启用酒馆脚本生成桥");
			};
			const runTavernGeneration = async (sessionId, request, signal) => {
				const response = await fetch(TAVERN_GENERATION_PATH, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify({
						format: 0,
						sessionId,
						...request
					}),
					...signal === void 0 ? {} : { signal }
				});
				const responseText = await response.text();
				let value;
				try {
					value = JSON.parse(responseText);
				} catch {
					throw new Error(response.ok ? "Host 返回了无法识别的脚本生成结果" : `酒馆脚本生成失败（${response.status}）`);
				}
				if (!response.ok || value.format !== 0 || typeof value.text !== "string") throw new Error(value.error ?? `酒馆脚本生成失败（${response.status}）`);
				return value.text;
			};
			const runTavernPromptPreview = async (sessionId, request, signal) => {
				const response = await fetch(TAVERN_PROMPT_PREVIEW_PATH, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify({
						format: 0,
						sessionId,
						...request
					}),
					...signal === void 0 ? {} : { signal }
				});
				const responseText = await response.text();
				let value;
				try {
					value = JSON.parse(responseText);
				} catch {
					throw new Error(response.ok ? "Host 返回了无法识别的提示词预览" : `提示词预览失败（${response.status}）`);
				}
				if (!response.ok || value.format !== 0 || !Array.isArray(value.prompts) || value.prompts.some((prompt) => typeof prompt !== "object" || prompt === null || prompt.role !== "system" && prompt.role !== "user" && prompt.role !== "assistant" || typeof prompt.content !== "string")) throw new Error(value.error ?? `提示词预览失败（${response.status}）`);
				return value.prompts;
			};
			const runTavernModelList = async (request) => {
				const response = await fetch(TAVERN_MODEL_LIST_PATH, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify({
						format: 0,
						...request
					})
				});
				const responseText = await response.text();
				let value;
				try {
					value = JSON.parse(responseText);
				} catch {
					throw new Error(response.ok ? "Host 返回了无法识别的模型列表" : `模型列表读取失败（${response.status}）`);
				}
				if (!response.ok || value.format !== 0 || !Array.isArray(value.models) || value.models.some((model) => typeof model !== "string")) throw new Error(value.error ?? `模型列表读取失败（${response.status}）`);
				return value.models;
			};
			const probeRpDistribution = async (target) => {
				const response = await fetch(`${RP_DISTRIBUTION_BRIDGE_PATH}?target=${encodeURIComponent(target)}`, { headers: { accept: "application/json" } });
				const value = await response.json();
				if (!response.ok || value.format !== 0 || typeof value.target !== "string" || typeof value.generatedAt !== "number" || typeof value.experienceCount !== "number" || typeof value.componentCount !== "number" || typeof value.capabilityCount !== "number" || !validRpDistributionRemoteAssets(value.remoteAssets)) throw new Error(value.error ?? `模块化 RP 连接失败（${response.status}）`);
				return value;
			};
			const transferRpDistribution = async (target, kind, id) => {
				const response = await fetch(RP_DISTRIBUTION_BRIDGE_PATH, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify({
						format: 0,
						target,
						kind,
						id
					})
				});
				const value = await response.json();
				if (!response.ok || value.format !== 0 || typeof value.target !== "string" || value.kind !== kind || value.sourceId !== id || !Array.isArray(value.savedIds) || value.savedIds.some((savedId) => typeof savedId !== "string") || typeof value.compatibilityDifferenceCount !== "number") throw new Error(value.error ?? `RP 资产复制失败（${response.status}）`);
				return value;
			};
			const receiveRpDistribution = async (target, kind, id) => {
				const response = await fetch(RP_DISTRIBUTION_BRIDGE_PATH, {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json"
					},
					body: JSON.stringify({
						format: 0,
						operation: "import-asset",
						target,
						kind,
						id
					})
				});
				const value = await response.json();
				if (!response.ok || value.format !== 0 || value.operation !== "import-asset" || typeof value.target !== "string" || value.kind !== kind || value.sourceId !== id || typeof value.savedId !== "string" || typeof value.name !== "string") throw new Error(value.error ?? `RP 资产复制失败（${response.status}）`);
				return value;
			};
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "agent-rp-character-header",
				order: -100
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoleplayHeader, {
				...props,
				loadAvatar,
				renameSession,
				configurePreset,
				importPresetFile,
				importPreset,
				managePresetLibrary,
				configureWorldInfo,
				importWorldInfo,
				listCharacters,
				readCharacter,
				setCharacterArchived,
				importCharacterFile,
				migrateChat,
				migrateRpDistributionChat,
				exportChat,
				listMemory,
				manageMemory,
				startCharacterSession: startCharacterFromCurrentSession,
				listPresets,
				listPersonas,
				savePersona,
				deletePersona,
				applyPersona,
				loadModelCapabilities
			})));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "agent-rp",
				order: 25,
				label: "Agent RP"
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspaceSettingsSection, {
				...props,
				workspaceSettings,
				workspaceList
			})));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "agent-rp-interoperability",
				order: 26,
				label: "RP 互通"
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RpDistributionBridgeSection, {
				...props,
				listCharacters,
				listPresets,
				listPersonas,
				listWorldInfos,
				probe: probeRpDistribution,
				transfer: transferRpDistribution,
				receive: receiveRpDistribution
			})));
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "agent-rp-blank-launcher",
				order: -100
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BlankRoleplayLauncher, {
				...props,
				workspaceSettings,
				workspaceList,
				listCharacters,
				readCharacter,
				setCharacterArchived,
				importCharacterFile,
				migrateChat: migrateChatFromBlankSession,
				migrateRpDistributionChat: migrateRpDistributionChatFromBlankSession,
				startCharacterSession: startCharacterFromBlankSession,
				listPresets,
				importPresetFile,
				listPersonas,
				savePersona,
				deletePersona
			})));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-tavern-variables"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-tavern-trigger"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-character-library"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-chat-import"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-persona"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-memory"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-preset-configure"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-preset-library"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-generation"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-draw"
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageGenerationCommandCard, {
				...props,
				runImageGeneration
			})));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-world-info"
			}, () => null));
			ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
				name: "conversation.chat.commandview",
				key: "rp-world-info-import"
			}, () => null));
			ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
				name: "conversation.chat.turnTail",
				priority: 100,
				select: (owner) => {
					const closing = owner.turn.data.get("turn-tail")?.closing;
					return closing === null || closing === void 0 ? null : { replySeq: closing.finalNode.seq };
				}
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GenerationTail, {
				...props,
				runGeneration,
				rewriteTurn,
				continueFromTurn,
				runImageGeneration,
				loadPublishedImage: loadAvatar
			})));
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "agent-rp-status",
				order: -100
			}, roleplayComposerDockComponent(ctx, runImageGeneration, runTavernMutation, runTavernGeneration, runTavernPromptPreview, runTavernModelList, runTavernTrigger, configurePreset)));
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "agent-rp-sillytavern-import-hint",
				order: -10
			}, importHintComponent(ctx, migrateSillyTavernDraft, listPresets)));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
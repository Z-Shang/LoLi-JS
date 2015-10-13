//Type Class:

var L_ERR = "";

function loliType(name, id, prnt){
    var obj = Object();
    obj.name = name;
    obj.id = id;
    obj.prnt = prnt;
    obj.toString = function(){ 
        return "#" + obj.name;
    };
    return obj;
}

function isDerived(type, from){
    if(type == from){
        return true;
    }
    if(type.prnt == from){
        return true;
    }
    if(type.prnt == null){
        return false;
    }
    return isDerived(type.prnt, from);
}

var L_OBJ = loliType("Object", "OBJ", null);
var L_NUM = loliType("Number", "NUM", L_OBJ);
var L_SYM = loliType("Symbol", "SYM", L_OBJ);
var L_KEY = loliType("Keyword", "KEY", L_OBJ);
var L_BOOL = loliType("Boolean", "BOOL", L_KEY);
var L_CONS = loliType("Cons", "CONS", L_OBJ);
var L_CHAR = loliType("Character", "CHAR", L_OBJ);
var L_FN = loliType("Function", "FN", L_OBJ);
var L_PRIM = loliType("Primitive", "PRIM", L_FN);
var L_LAMBDA = loliType("Lambda", "LAMBDA", L_FN);
var L_STR = loliType("String", "STR", L_OBJ);

//LoLi Object:

function loliObj(value, type){
    var obj = Object();
    obj.value = value;
    obj.type = type;
    obj.eval = function(env){
        return obj; 
    };
    obj.toString = function(){
        return obj.value;
    };
    return obj;
}

function loliNum(value){
    return loliObj(value, L_NUM);
}

function loliSym(value){
    var obj = loliObj(value, L_SYM);
    obj.eval = function(env){
        if(lookUp(obj, env) == L_NIL){
            return L_NIL;   
        }else{
            return lookUp(obj, env);
        }
    }
    return obj;
}

function loliKey(value){
    var obj = loliObj(value, L_KEY);
    obj.toString = function() { return "#" + obj.value; }
    return obj;
}

function loliBool(value){
    if(value === true){
        var obj = loliKey("TRUE");
        obj.type = L_BOOL;
        return obj;
    }else if(value === false){
        var obj = loliKey("FALSE");
        obj.type = L_BOOL;
        return obj;
    }
}

var DO_NOT_EVAL = ["if", "def", "set!", "quote", "\\"];

function loliCons(car, cdr){
    var consV = Object();
    consV["head"] = car;
    consV["tail"] = cdr;
    var obj = loliObj(consV, L_CONS);
    obj.toString = function() {
        var tmp = "(" + obj.head().toString();
        if(obj.tail() == L_NIL){
            return tmp + ")";
        }else{
            return tmp + " " + obj.tail().toString() + ")";
        }
    }
    obj.head = function() { return obj.value["head"]; }
    obj.tail = function() { return obj.value["tail"]; }
    obj.eval = function(env) {
        if(DO_NOT_EVAL.indexOf(obj.head().value) >= 0){
            return apply(lookUpWithType(obj.head(), L_FN, L_TOP_ENV), obj.tail(), env);
        }
        var valued_lst = L_NIL;
        var tmp = obj.tail();
        while(tmp != L_NIL){
            valued_lst = loliCons(tmp.head().eval(env), valued_lst);
            tmp = tmp.tail();
        }
        if(isDerived(obj.head().type, L_CONS)){
            return apply(obj.head().eval(env), L_REVERSE(valued_lst), env);
        }else{
            return apply(lookUpWithType(obj.head(), L_FN, L_TOP_ENV), L_REVERSE(valued_lst), env);
        }
    }
    return obj;
}

function loliChar(value){
    return loliObj(value, L_CHAR);
}

function loliFn(argType, returnType){
    var value = Object();
    value["args"] = argType;
    value["return"] = returnType;
    var obj = loliObj(value, L_FN);
    obj.toString = function(){
        return "<Function: " + obj.value["args"].toString() + " => " + obj.value["return"].toString() + ">";
    }
    return obj;
}

function loliPrim(argType, returnType, fn){
    var obj = loliFn(argType, returnType);
    obj.fn = fn;
    obj.type = L_PRIM;
    obj.toString = function(){
        return "<Primitive: " + obj.value["args"].toString() + " => " + obj.value["return"].toString() + ">";
    }
    obj.eval = function(env){
        return obj;
    }
    return obj;
}

function loliLambda(returnType, argLst, lexp, env){
    var obj = loliFn(L_CONS, returnType);
    obj.exp = lexp;
    obj.argLst = argLst;
    obj.type = L_LAMBDA;
    obj.cenv = env;
    obj.toString = function(){
        return "<Lambda: " + obj.argLst.toString() + " => " + obj.value["return"].toString() + ">";
    }
    obj.eval = function(env){
        return obj.exp.eval(L_APPEND(obj.cenv, env));
    }
    return obj;
}

function loliStr(value){
    var obj = loliObj(value);
    obj.type = L_STR;
    obj.toString = function(){
        return '\"' + obj.value + '\"';
    }
    return obj;
}

//Basic Symbols

var L_NIL = loliSym("NIL");
var L_T = loliSym("T");
var L_TRUE = loliBool(true);
var L_FALSE = loliBool(false);
var L_IF = loliPrim(L_CONS, L_OBJ, PRIM_IF);
var L_DEF = loliPrim(L_OBJ, L_OBJ, PRIM_DEF);
var L_QUOTE = loliPrim(L_OBJ, L_OBJ, PRIM_QUOTE);

//ENV
var L_TOP_ENV = loliCons(loliCons(L_NIL, L_NIL), L_NIL);

function lookUp(sym, env){
    if(env == undefined){
        return L_NIL;
    }
    if(env == L_NIL){
        return L_NIL;
    }else{
        var car = env.head();
        if(car.head().value == sym.value){
            return car.tail();
        }else{
            return lookUp(sym, env.tail());
        }
    }
}

function lookUpWithType(sym, type, env){
    if(env == L_NIL){
        return L_NIL;
    }else{
        var car = env.head();
        if(car.head().value == sym.value){
            if(isDerived(car.tail().type, type)){
                return car.tail();
            }else{
                return lookUpWithType(sym, type, env.tail());
            }
        }else{
            return lookUpWithType(sym, type, env.tail());
        }
    }
}

function addToEnv(sym, value){
    if(lookUpWithType(sym, value.type, L_TOP_ENV) == L_NIL){
        L_TOP_ENV = loliCons(loliCons(sym, value), L_TOP_ENV);
        return value;
    }else{
        L_ERR = "Symbol bound to this type is already in the current environment";
        return L_NIL;
    }
}

//Primitive functions

function PRIM_QUOTE(a, env){
    return a.head();
}

function PRIM_DEF(obj, env){
    var result = addToEnv(obj.head(), obj.tail().head().eval(env));
    if(result != L_NIL){
        return result.toString();
    }else{
        return L_NIL;
    }
}

function PRIM_SET(obj, env){
    var sym = obj.head();
    var value = obj.tail().head().eval(env);
    var current = lookUpWithType(sym, value.type, L_TOP_ENV);
    if(current == L_NIL){
        L_ERR = "Typed variable is not bound in the current environment";
        return L_NIL;
    }else{
        var tmp_env = L_NIL;
        while(L_TOP_ENV.tail() != L_NIL){
            if(L_TOP_ENV.head().head().value == sym.value){
                tmp_env = loliCons(loliCons(sym, value), tmp_env);
            }else{
                tmp_env = loliCons(L_TOP_ENV.head(), tmp_env);
            }
            L_TOP_ENV = L_TOP_ENV.tail();
        }
        L_TOP_ENV = L_REVERSE(tmp_env);
        return value;
    }
}

function PRIM_IF(obj, env){
    var cond = obj.head().eval(env);
    obj = obj.tail();
    var wtrue = obj.head();
    obj = obj.tail();
    if(obj != L_NIL){
        wfalse = obj.head();
    }else{
        wfalse = L_NIL;
    }
    if(cond.value == "TRUE"){
        return wtrue.eval(env);
    }else{
        return wfalse.eval(env);
    }
}

function PRIM_GR(obj, env){
    return loliBool( obj.head().value > obj.tail().head().value);
}

function PRIM_LS(obj, env){
    return loliBool( obj.head().value < obj.tail().head().value);
}

function PRIM_ADD(a, env){
    var tmp = 0;
    while(a != L_NIL){
        if(!isDerived(a.head().type, L_NUM)){
            L_ERR = "Cannot apply arithmetic function on non-numeric value";
            return L_NIL;
        }else{
            tmp = tmp + a.head().value;
        }
        a = a.tail();
    }
    return loliNum(tmp);
}

function PRIM_SUB(a, env){
    var tmp = a.head().value;
    a = a.tail();
    while(a != L_NIL){
        if(!isDerived(a.head().type, L_NUM)){
            L_ERR = "Cannot apply arithmetic function on non-numeric value";
            return L_NIL;
        }else{
            tmp = tmp - a.head().value;
        }
        a = a.tail();
    }
    return loliNum(tmp);
}

function PRIM_MUL(a, env){
    var tmp = 1;
    while(a != L_NIL){
        if(!isDerived(a.head().type, L_NUM)){
            L_ERR = "Cannot apply arithmetic function on non-numeric value";
            return L_NIL;
        }else{
            tmp = tmp * a.head().value;
        }
        a = a.tail();
    }
    return loliNum(tmp);
}

function PRIM_DIV(a, env){
    var tmp = a.head().value;
    a = a.tail();
    while(a != L_NIL){
        if(!isDerived(a.head().type, L_NUM)){
            L_ERR = "Cannot apply arithmetic function on non-numeric value";
            return L_NIL;
        }else{
            if(a.head().value != 0){
                tmp = tmp / a.head().value;
            }else{
                L_ERR = "Divide by zero";
                return L_NIL;
            }
        }
        a = a.tail();
    }
    return loliNum(tmp);
}

function PRIM_CONS(a, env){
    return loliCons(a.head(), a.tail().head());
}

function PRIM_HEAD(a, env){
    if(!isDerived(a.head().type, L_CONS)){
        L_ERR = "This function is not defined for types other than Cons";
        return L_NIL;
    }else{
        return a.head().head();
    }
}

function PRIM_TAIL(a, env){
    if(!isDerived(a.head().type, L_CONS)){
        L_ERR = "This function is not defined for types other than Cons";
        return L_NIL;
    }else{
        return a.head().tail();
    }
}

function PRIM_LAMBDA(obj, env){
    var rtype = obj.head();
    obj = obj.tail();
    var alist = obj.head();
    obj = obj.tail();
    var exp = obj.head();
    return loliLambda(rtype, alist, exp, env);
}

function PRIM_TYPE_OF(obj, env){
    return loliKey(obj.head().type.toString().substr(1));
}

function PRIM_EQ(obj, env){
    var a = obj.head();
    var b = obj.tail().head();
    return loliBool( a.value == b.value && a.type == b.type );
}

//Reader
function isBalanced(str){
    var count = 0;
    var quoted = false;
    for(var i = 0; i < str.length; i++){
        var chr = str[i];
        if(chr == "\""){
            quoted = !quoted;
        }
        if(!quoted){
            if(chr == "("){
                count++;
            }
            if(chr == ")"){
                if(count > 0){
                    count--;
                }else{
                    L_ERR = "extra ) found";
                    return L_NIL;
                }
            }
        }
    }
    return (count == 0 && !quoted);
}

function is_white_space(c){
    return (c == ' ' || c == '\t' || c == '\n');
}

function parser(str){
    while(is_white_space(str[0])){
        str = str.substr(1);
    }   
    if(str == ''){
        return L_NIL;
    }
    if(str[0] == '\''){
        return loliCons(loliSym("quote"), loliCons(parser(str.substr(1)), L_NIL));
    }
    if(str[0] == '\"'){
        for(var i = 1; i < str.length; i++){
            if(str[i] == '\"'){
                return loliStr(str.substr(1, i -1));
            }
        }
    }
    if(str[0] == '('){
        return parse_list(str.substr(1, str.length - 2));
    }
    if(str[0] == '#'){
        for(var i = 1; i < str.length; i++){
            if(is_white_space(str[i])){
                if(i > 1){
                    var k = str.substr(1, i - 1);
                    if(k != "TRUE" || k != "FALSE"){
                        return loliKey(k);
                    }else{
                        return loliBool(k == "TRUE");
                    }
                }else{
                    L_ERR = "Empty keyword";
                    return L_NIL;
                }
            }
        }
        var k = str.substr(1);
        if(k != "TRUE" && k != "FALSE"){
            return loliKey(k);
        }else{
            return loliBool(k == "TRUE");
        }
    }
    if(!isNaN(str)){
        return loliNum(eval(str));
    }
    for(var i = 0; i < str.length; i++){
        if(is_white_space(str[i])){
            return loliSym(str.substr(0, i));
        }
    }
    return loliSym(str);
}

function parse_list(str){
    while(str[0] == ' ' || str[0] == '\t' || str[0] == '\n'){
        str = str.substr(1);
    }   
    if(str == ''){
        return L_NIL;
    }
    for(var i = 0; i < str.length; i++){
        if(is_white_space(str[i])){
            return loliCons(parser(str.substr(0, i)), parse_list(str.substr(i + 1)));
        }
        if(str[i] == '('){
            var tmp = pairUp(str.substr(i));
            return loliCons(parser(tmp), parse_list(str.substr(i + tmp.length)));
        }
    }
    if(parser(str) == L_NIL){
        return loliCons(L_NIL, L_NIL);
    }
    return loliCons(parser(str), L_NIL);
}

function pairUp(str){
    var count = 0;
    var quoted = false;
    for(var i = 0; i < str.length; i++){
        var chr = str[i];
        if(chr == "\""){
            quoted = !quoted;
        }
        if(!quoted){
            if(chr == "("){
                count++;
            }
            if(chr == ")"){
                if(count > 0){
                    count--;
                }
            }
        }
        if(count == 0 && !quoted){
            return str.substr(0, i + 1);
        }
    }
    return str;
}

//Apply
function apply(proc, obj, env){
    if(isDerived(proc.type, L_PRIM)){
        if(isDerived(obj.type, L_CONS)){
            return proc.fn(obj, env);
        }else{
            return proc.fn(loliCons(obj, L_NIL), env);
        }
    }else if(isDerived(proc.type, L_LAMBDA)){
        var tmp_env = L_NIL;
        var arg_lst = proc.argLst;
        while(arg_lst != L_NIL && obj != L_NIL){
            tmp_env = loliCons(loliCons(arg_lst.head(), obj.head()), tmp_env);
            arg_lst = arg_lst.tail();
            obj = obj.tail();
        }
        proc.cenv = tmp_env;
        return proc.eval(env);
    }
}

//Utils
function L_APPEND(a, b){
    var tmp = b;
    while(a != L_NIL){
        tmp = loliCons(a.head(), tmp);
        a = a.tail();
    }
    return tmp;
}

function L_REVERSE(a){
    var tmp = L_NIL;
    while(a != L_NIL){
        tmp = loliCons(a.head(), tmp);
        a = a.tail();
    }
    return tmp;
}

addToEnv( L_T, L_T);
addToEnv( loliSym("quote"), L_QUOTE);
addToEnv( loliSym("\\"), loliPrim(L_OBJ, L_OBJ, PRIM_LAMBDA));
addToEnv( loliSym("+"), loliPrim(L_NUM, L_NUM, PRIM_ADD));
addToEnv( loliSym("-"), loliPrim(L_NUM, L_NUM, PRIM_SUB));
addToEnv( loliSym("*"), loliPrim(L_NUM, L_NUM, PRIM_MUL));
addToEnv( loliSym("/"), loliPrim(L_NUM, L_NUM, PRIM_DIV));
addToEnv( loliSym("cons"), loliPrim(L_OBJ, L_CONS, PRIM_CONS));
addToEnv( loliSym("head"), loliPrim(L_CONS, L_OBJ, PRIM_HEAD));
addToEnv( loliSym("tail"), loliPrim(L_CONS, L_OBJ, PRIM_TAIL));
addToEnv( loliSym("def"), loliPrim(L_OBJ, L_OBJ, PRIM_DEF));
addToEnv( loliSym("set!"), loliPrim(L_OBJ, L_OBJ, PRIM_SET));
addToEnv( loliSym("if"), loliPrim(L_OBJ, L_OBJ, PRIM_IF));
addToEnv( loliSym("typeof"), loliPrim(L_OBJ, L_OBJ, PRIM_TYPE_OF));
addToEnv( loliSym("eq?"), loliPrim(L_OBJ, L_BOOL, PRIM_EQ));
addToEnv( loliSym(">"), loliPrim(L_NUM, L_BOOL, PRIM_GR));
addToEnv( loliSym("<"), loliPrim(L_NUM, L_BOOL, PRIM_LS));

//Entrance

function entrance(str){
    L_ERR = "";
    return parser(str).eval(L_TOP_ENV).toString();
}


//var test_y = "(def y (\\ #FN (fn)    ((\\ #FN (meta)        (meta meta))     (\\ #FN (meta-fn)        (fn            (\\ #FN (args)                (apply (meta-fn meta-fn) args)))))))";

//console.log(entrance(test_y));

var lnot = "(def not (\\ #BOOL (bool) (if bool #FALSE #TRUE)))";
entrance(lnot);
var land = "(def and (\\ #BOOL (a b) (if a b a)))";
entrance(land);
var lor = "(def or (\\ #BOOL (a b) (if a a b)))";
entrance(lor);

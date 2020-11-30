//#region tools
function abs_log(n){
    return Math.log10(Math.abs(n))
}

function expo_text(num,unit="", get_raw=false){
    if (num==0) {
        if (get_raw==true){return "0"} else{return "0"+unit}
    }
    log_num = abs_log(num)
    if (log_num > -1 && log_num < 2) {
        return Math.round(num * 10000) / 10000 + unit
    }
    if (get_raw==true) {
        return num.toExponential().toString()
    }
    const txt = num.toExponential().toString().replace("+","")
    const res = txt.split("e")
    return res[0].substring(0,5)+"\\times10^{"+res[1]+"}"+unit
}

function async_renew(){
    setTimeout(async function (){
        MathJax.typesetPromise() 
        }, 0)
}

function reduce_frac(nume, deno){
    if ((deno <=1)&&(deno >= -1) ||(nume <=1)&&(nume >= -1)) {
        return [deno, nume]
    }
    i = 2
    while (true) {
        if (!(deno % i) && !(nume % i)) {
            deno /= i
            nume /= i
        } else{i++}
        if (( nume > 0 && i > nume) || ( nume < 0 && i < -nume ))
            break
        if (( deno > 0 && i > deno) || ( deno < 0 && i < -deno ))
            break
    }
    return [nume, deno]
}

function frac_text(nume, deno, reduce=true, units=""){
    if (reduce) {
        res = reduce_frac(nume, deno)
    
        if (res[0]==0) {
            return "0"
        }
        if(res[1]==1){
            return res[0]
        }
        if(res[1]==-1){
            return -res[0]
        }
        return "\\frac{"+res[0]+"}{"+res[1]+"}"
    } else{
        nume_u = ""
        deno_u = ""
        neg = false
        if (nume<0) {nume = -nume; neg=!neg}
        if (deno<0) {deno = -deno; neg=!neg}
        neg_sign = neg ? "-":""
        if (Array.isArray(units)&& units.length==2){
            nume_u = units[0]
            deno_u = units[1]
        } else{
            nume_u = deno_u = units
        }
        return neg_sign +"\\frac{"+expo_text(nume, nume_u)+"}{"+expo_text(deno, deno_u)+"}"
    }
}

function ftext(txt, formate=0){
    if (formate==0)
        return "$\\mathrm{"+txt+"}$"
    if (formate==1)
        return "$\\mathrm{^{"+txt+"}}$"
    if (formate==-1)
        return "$\\mathrm{_{"+txt+"}}$"
}

class formula_ctr{
    constructor(short, long){
        this.cur_n = 0
        this.forms = [short, long]
    }
    show(n){
        this.forms[n].show()
        this.forms[1-n].hide()
    }
}

var unit_conv
$.ajax({
    url: "../static/json/unit_conv.json",
    dataType: 'json',
    async: false,
    success: function(data) {
        unit_conv=data
    }
});

class item {
    constructor(comp, std_unit="", deci_frac=false, is_std=true, rep_unit=""){
        this.comp = comp

        this.std_unit = std_unit
        this.rep_unit = is_std ? this.std_unit : rep_unit

        this.multipliant = is_std ? 1 : this.get_unit_multipliant(rep_unit, std_unit)
        
        this.val = 0
        this.rep_val = 0

        this.nume = 0
        this.deno = 1
        this.is_frac = (Array.isArray(std_unit) && std_unit.length==2) || deci_frac
        this.deci_frac = deci_frac
        this.is_NAN = false
        this.renew = new Object()
    }

    set_renew(obj){
        this.renew = obj;
        if (this.renew && this.renew[0]) {
            if (isNaN(this.renew[0])) {
                if (Array.isArray(this.renew[0])) {this.set_value(this.renew[0])} else{this.renew[0]()}} else{this.set_value(this.renew[0])}
        }
        return this;
    }

    set_value(val){
        return this.set(val)
    }

    static compare_unit(cur, tar){
        if (unit_conv[cur] && unit_conv[cur].hasOwnProperty(tar)){
            return unit_conv[cur][tar]
        } else{return 0;}
    }

    renew_text_by_item_type(formate, input_ignore=false){
        if (this.is_NAN){this.comp.text(ftext("NAN", formate)) == true; return null}
        var str = ""
        if (this.comp.length>0 && this.comp.get(0).tagName == "INPUT"){
            if (input_ignore) {return}
            this.comp.val(expo_text(this.rep_val, "", true))
            return
        }
        if(this.is_frac){
            str = frac_text(this.nume*this.multipliant, this.deno, !this.deci_frac, this.rep_unit)
        } else{
            str = expo_text(this.rep_val, this.rep_unit)
        }
        this.comp.text(ftext(str, formate))
    }

    get_unit_multipliant(base, target){
        var multipliant = 1;
        if (base == target) {
            return multipliant
        }
        if(this.is_frac){
            if (Array.isArray(base) &&base.length==2) {
                if (Array.isArray(target) &&target.length==2){
                    // base: "cm" tar:"m" -> 1e-2
                    multipliant *= item.compare_unit(base[0], target[0])
                    // tar:"h" base: "s" -> 3600
                    multipliant *= item.compare_unit(target[1], base[1])
                    // multipliant = 1e-2x3.6e+3=36
                } else {
                    multipliant *= item.compare_unit(base[0], target)
                    multipliant *= item.compare_unit(target, base[1])
                }
            }
        } else{
            // rep: "cm" tar:"m" -> 1e-2
            multipliant*= item.compare_unit(base, target)
        }
        return multipliant
    }

    change_unit(u_name, formate=0){
        var multipliant = this.get_unit_multipliant(this.rep_unit, u_name)
        if (multipliant != 0){
            this.rep_val *= multipliant
            this.rep_unit = u_name
            this.renew_text_by_item_type(formate)
            this.multipliant *= multipliant
        }else{
            console.log("INVALID INPUT UNIT: "+u_name, this.rep_unit)
        }
    }

    set(val, formate=0, input_ignore=false){
        if (isNaN(val) && !Array.isArray(val)){
            this.is_NAN == true;
            return this;
        } else{
            this.is_NAN == false
        }

        if (Array.isArray(val)) {
            this.is_frac = true
            var nume = 1
            var deno = 1
            
            if (this.deci_frac) {
                nume = typeof val[0] == "number" ? val[0] : parseFloat(val[0])
                deno = typeof val[1] == "number" ? val[1] : parseFloat(val[1])
            } else{
                nume = typeof val[0] == "number" ? val[0] : parseInt(val[0])
                deno = typeof val[1] == "number" ? val[1] : parseInt(val[1])
            }
            this.nume = nume
            this.deno = deno
            this.val = nume/deno
            // str = frac_text(this.nume, this.deno, !this.deci_frac, this.rep_unit)
        } else
        {
            if (this.deci_frac) {console.log(val, " AMBIGUOUS SINCE DECI_FRAC=TRUE BUT THE INSERT VALUE IS NOT AN ARRAY"); return this}
            else{this.is_frac = false}
            if (typeof val == "number"){this.val = val}
            else{this.val = parseFloat(val)}
            this.nume = val
            this.deno = 1
        }
        this.rep_val = this.val * this.multipliant
        this.renew_text_by_item_type(formate, input_ignore)
        return this
    }

    copy(item, formate=0){
        this.rep_unit = item.rep_unit
        this.std_unit = item.std_unit
        this.multipliant = item.multipliant
        this.rep_val = item.rep_val
        this.val = item.val
        this.nume = item.nume
        this.deno = item.deno
        this.is_frac = item.is_frac
        this.deci_frac = item.deci_frac
        this.is_NAN = item.is_NAN
        this.renew_text_by_item_type(formate)
        return this
    }

    getNaN(){
        return isNaN(this.comp.text)
    }
}
//#endregion

$(function(){
    //#region import jsons & value definition
    var constants
    var semi_prop
    
    $.ajax({
        url: "../static/json/constants.json",
        dataType: 'json',
        async: false,
        success: function(data) {
            constants=data
        }
    });
    
    $.ajax({
        url: "../static/json/semi_prop.json",
        dataType: 'json',
        async: false,
        success: function(data) {
            semi_prop=data
        }
    });

    var k, h, c, epsilon_o
    
    k = constants.k.eV.value
    h = constants.h.J.value
    c = constants.c.m.value
    epsilon_o = constants.epsilon_o.m.value
    epsilon_o_unit = constants.epsilon_o.m.unit
    //#endregion
    //#region formulas
    n_i_formula = new formula_ctr($("#n_i_short"),$("#n_i_long"))
    n_i_formula.show(0)
    //#endregion

    //#region test
    var $n1 = $("#n1")
    var $n2 = $("#n2")
    var $out = $("#out")
    
    $n1.on("change", function(){
        if ($n2.val()!="") {
            res = parseFloat($n2.val())*parseFloat($n1.val())
            $out.text(ftext(expo_text(res)))
            async_renew()
        }
    })
    $n2.on("change", function(){
        if ($n1.val()!="") {
            res = parseFloat($n2.val())*parseFloat($n1.val())
            $out.text(ftext(expo_text(res)))
            async_renew()
        }
    })
    //#endregion

    // #region p1 vars
    var $T = $("#temp")
    var $semi_type = $("#semi_type")
    
    cur_type = "Si"

    N_ic = new item($(".N_ic"), "cm^{-3}").set(semi_prop.Si.N_ic)
    N_iv = new item($(".N_iv"), "cm^{-3}").set(semi_prop.Si.N_iv)
    N_c = new item($(".N_c"), "cm^{-3}").set(semi_prop.Si.N_ic)
    N_v = new item($(".N_v"), "cm^{-3}").set(semi_prop.Si.N_iv)
    Temp = new item($(".T_text"), "K").set(300)
    kT = new item($(".kT"), "eV").set(k*Temp.val)
    E_g = new item($(".E_g"), "eV").set(semi_prop.Si.E_g)
    alpha = new item($(".alpha_frac"), "").set(1)
    alpha_3o2 = 1
    negEg_2kT = new item($(".negEg_2kT"), "").set(-E_g.val/(2*kT.val), 1)
    n_i = new item($(".n_i"), "cm^{-3}").set(semi_prop.Si.n_i)
    
    //#endregion

    // #region p2 vars
    E_c_E_F_input = new item($("#E_c_E_F_input"), "eV").set(.552)
    $E_c_E_F_input = $("#E_c_E_F_input")
    E_c_E_F_out = new item($(".E_c_E_F_out"), "eV")
    E_c_E_F = new item($(".E_c_E_F"), "eV").set(.552)

    E_F_E_v_input = new item($("#E_F_E_v_input", "eV")).set(.552)
    $E_F_E_v_input = $("#E_F_E_v_input")
    E_F_E_v_out = new item($(".E_F_E_v_out"), "eV")
    E_F_E_v = new item($(".E_F_E_v"), "eV").set(.552)

    n_o_input = new item($("#n_o_input"), "cm^{-3}").set(1.5e+10)
    $n_o_input = $("#n_o_input")
    n_o_out = new item($(".n_o_out"), "cm^{-3}")

    p_o_input = new item($("#p_o_input"), "cm^{-3}").set(1.5e+10)
    $p_o_input = $("#p_o_input")
    p_o_out = new item($(".p_o_out"), "cm^{-3}")
///////////////////////////////////////////////////////////////////////////
    aNcDno_frac = new item($(".aNcDno_frac"), "cm^{-3}", true).set([semi_prop.Si.N_ic, 1.5e+10])
    EcEfkt_frac = new item($(".EcEfkt_frac"), "eV", true).set([-.552, kT.val], 1)

    aNvDpo_frac = new item($(".aNvDpo_frac"), "cm^{-3}", true)
    EfEvkt_frac = new item($(".EfEvkt_frac"), "eV", true).set([-.552, kT.val], 1)
///////////////////////////////////////////////////////////////////////////
    E_F_E_v_out = new item($(".E_F_E_v_out"), "eV").set(E_g.val-E_c_E_F.val)
    
    E_c_E_F_out = new item($(".E_c_E_F_out"), "eV").set(E_g.val-E_F_E_v.val)
    n_o_out = new item($(".n_o_out"), "cm^{-3}").set(N_c.val*Math.exp(EcEfkt_frac.val))
    ni2ono_frac = new item($(".ni2ono_frac"), "cm^{-3}", true).set([n_i.val*n_i.val, n_o_out.val])
    p_o_out = new item($(".p_o_out"), "cm^{-3}").set(ni2ono_frac.val)
    ni2opo_frac = new item($(".ni2opo_frac"), "cm^{-3}", true).set([n_i.val*n_i.val, p_o_out.val])
    //#endregion
//////////////////////////////////////////////////////////////////// f_FD //
    EcminusEf = E_c_E_F.val
    E_Ef_val = EcminusEf-0.5

    f_FD_frac = new item($(".f_FD_frac"), "", true).set([1,Math.exp(E_Ef_val/kT.val)+1])
    f_FD = new item($(".f_FD"), "").set(f_FD_frac.val)
    one_minus_f_FD = new item($(".one_minus_f_FD", "")).set(1-f_FD.val)

    $E_c_E_input = $("#E_c_E_input")
    $E_E_v_input = $("#E_E_v_input")
    $external_E_input = $("#external_E_input")
    $external_fermi_input = $("#external_fermi_input")
    E_c_E_input_val = .5
    E_E_v_input_val = .5
    external_E_input_val = .5
    external_fermi_input_val = .5
/////////////////////////////////////////////////////////////// selectors //
    $p2_selector = $("#p2_selector")
    var p2_values = $.map($('#p2_selector option'),function(e){return e.value;});
    var cur_p2_selection = p2_values[0]

    $el_selector = $("#el_selector")
    var el_values = $.map($('#el_selector option'),function(e){return e.value;});
    var cur_el_selection = el_values[0]
    async_renew()

    function refresh_T(){
        kT.set(k*Temp.val)
        alpha.set([Temp.val, 300])
        alpha_3o2 = Math.pow(alpha.val,3/2)
        negEg_2kT.set(-E_g.val/(2*k*Temp.val), 1)
        if (this.value == 300) {
            n_i_formula.show(0)
            N_c.set(N_ic.val)
            N_v.set(N_iv.val)
            n_i.set(semi_prop[cur_type].n_i)
        } else{
            n_i_formula.show(1)
            N_c.set(alpha_3o2 * N_ic.val)
            N_v.set(alpha_3o2 * N_iv.val)
            n_i.set(alpha_3o2 * Math.pow(N_ic.val*N_iv.val,1/2)*Math.exp(negEg_2kT.val))
        }
        EcEfkt_frac.set([-.552, kT.val], 1)
        n_o_out.set(N_c.val*Math.exp(EcEfkt_frac.val))
        aNcDno_frac.set([N_c.val, 1.5e+10])
        refresh_fd_Na()
        refresh_fd_Nd()
    }
    function refresh_solve_p_o(){
        E_F_E_v.set(E_F_E_v_input.val)
        EfEvkt_frac.set([-E_F_E_v_input.val, kT.val], 1)
        p_o_out.set(N_v.val*Math.exp(EfEvkt_frac.val))
        ni2opo_frac.set([n_i.val*n_i.val, p_o_out.val])

        n_o_out.set(ni2opo_frac.val)
        E_c_E_F_out.set(E_g.val-E_F_E_v.val)
        EcminusEf = E_c_E_F_out.val
    }
    function refresh_solve_E_c_E_F(){
        aNcDno_frac.set([N_c.val, 1.5e+10])
        E_c_E_F.copy(E_c_E_F_out.set(kT.val*Math.log(aNcDno_frac.val)))
        ni2ono_frac.set([n_i.val*n_i.val, n_o_input.val])

        p_o_out.set(ni2ono_frac.val)
        E_F_E_v_out.set(E_g.val-E_c_E_F.val)
        EcminusEf = E_c_E_F_out.val
    }
    function refresh_solve_n_o(){
        E_c_E_F.set(E_c_E_F_input.val)
            
        EcEfkt_frac.set([-E_c_E_F_input.val, kT.val], 1)
        n_o_out.set(N_c.val*Math.exp(EcEfkt_frac.val))
        ni2ono_frac.set([n_i.val*n_i.val, n_o_out.val])

        p_o_out.set(ni2ono_frac.val)
        E_F_E_v_out.set(E_g.val-E_c_E_F.val)
        EcminusEf = E_c_E_F_input.val
    }
    function refresh_solve_E_F_E_v(){
        aNvDpo_frac.set([N_v.val, 1.5e+10])
        E_F_E_v.copy(E_F_E_v_out.set(kT.val*Math.log(aNvDpo_frac.val)))
        ni2opo_frac.set([n_i.val*n_i.val, p_o_input.val])

        n_o_out.set(ni2opo_frac.val)
        E_c_E_F_out.set(E_g.val-E_F_E_v.val)
        EcminusEf = E_c_E_F_out.val
    }
    function refresh_data_p2(){
        if(cur_p2_selection == "solve_n_o"){refresh_solve_n_o()}
        else if (cur_p2_selection == "solve_E_c_E_F"){refresh_solve_E_c_E_F()} 
        else if(cur_p2_selection == "solve_p_o"){refresh_data_p2()}
        else if (cur_p2_selection == "solve_E_F_E_v"){refresh_solve_E_F_E_v()}
    }
    function refresh_data_el(){
        if (cur_el_selection == "E_c_E") {
            E_Ef_val = EcminusEf-E_c_E_input_val
        } else if(cur_el_selection == "E_E_v"){
            E_Ef_val = E_E_v_input_val+EcminusEf-E_g.val
        } else if(cur_el_selection == "E"){
            E_Ef_val = external_E_input_val-external_fermi_input_val
        }
        f_FD_frac.set([1,Math.exp(E_Ef_val/kT.val)+1])
        f_FD.set(f_FD_frac.val)
        one_minus_f_FD.set(1-f_FD_frac.val)
    }
    $semi_type.on("change", function(){
        // #region p1
        cur_type = this.value
        N_ic.set(semi_prop[this.value].N_ic)
        N_iv.set(semi_prop[this.value].N_iv)
        E_g.set(semi_prop[this.value].E_g)
        negEg_2kT.set(-E_g.val/(2*k*Temp.val), 1)
        if (Temp.val == 300){
            N_c.copy(N_ic)
            N_v.copy(N_iv)
            n_i.set(semi_prop[this.value].n_i)
        } else{
            N_c.set(alpha_3o2 * N_ic.val)
            N_v.set(alpha_3o2 * N_iv.val)
            n_i.set(alpha_3o2 * Math.pow(N_ic.val*N_iv.val,1/2)*Math.exp(negEg_2kT.val))
        }
        // #endregion
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // #region p2
        refresh_data_p2()
        refresh_data_el()
        refresh_fd_Na()
        refresh_fd_Nd()
        dielectric_constant.set(semi_prop[this.value].dielectric_constant)
        epsilon_s.set(epsilon_o.val*semi_prop[this.value].dielectric_constant)
        async_renew()
    })
    $T.on("change", function(){
        if (Temp.getNaN() || Temp.val<0) {Temp.set(0)}
        Temp.set(this.value)
        refresh_T()
        refresh_data_p2()
        refresh_data_el()
        async_renew()
    })
    //#region Boltzmann approximation 02
    $p2_selector.on("change", function(){
        cur_p2_selection = this.value
        $.each(p2_values, function (index, element) {
            $("."+ element).each(function(i){
                if ($(this).hasClass(cur_p2_selection)) {$(this).show()} else{$(this).hide()}
            })
        })
        refresh_data_p2()
        async_renew()
    })
    $n_o_input.on("change", function(){
        if (n_o_input.val<=0) {n_o_input.set(1.5e+10)}
        n_o_input.set(parseFloat(this.value))
        refresh_solve_E_c_E_F()
        async_renew()
    })
    $E_c_E_F_input.on("change", function(){
        E_c_E_F_input.set(parseFloat(this.value))
        refresh_solve_n_o()
        async_renew()
    })
    $p_o_input.on("change", function(){
        if (p_o_input.val<=0) {p_o_input.set(1.5e+10)}
        p_o_input.set(parseFloat(this.value))
        refresh_solve_E_F_E_v()
        async_renew()
    })
    $E_F_E_v_input.on("change", function(){
        E_F_E_v_input.set(parseFloat(this.value))
        refresh_solve_p_o()
        async_renew()
    })
    $el_selector.on("change", function(){
        cur_el_selection = this.value
        $.each(el_values, function (index, element) {
            if (element == cur_el_selection) {$("#"+element+"_s").show()} else{$("#"+element+"_s").hide()}
        })
        refresh_data_el()
        async_renew()
    })
    $E_c_E_input.on("change", function(){
        E_c_E_input_val = parseFloat(this.value)
        refresh_data_el()
        async_renew()
    })
    $E_E_v_input.on("change", function(){
        E_E_v_input_val = parseFloat(this.value)
        refresh_data_el()
        async_renew()
    })
    $external_E_input.on("change", function(){
        external_E_input_val = parseFloat(this.value)
        refresh_data_el()
        async_renew()
    })
    $external_fermi_input.on("change", function(){
        external_fermi_input_val = parseFloat(this.value)
        refresh_data_el()
        async_renew()
    })
    //#endregion

    //#region fermi-dirac function
    $Na_input = $("#Na_input")
    $Nd_input = $("#Nd_input")
    Na_m3 = new item($(".Na_m3"), "m^{-3}").set(1.5e+16)
    Nd_m3 = new item($(".Nd_m3"), "m^{-3}").set(1.5e+16)
    Na_ni_frac = new item($(".Na_ni_frac"),"cm^{-3}", true).set([1.5e+10,1.5e+10])
    Ei_Efp = new item($(".Ei_Efp"),"eV").set(0)
    Nd_ni_frac = new item($(".Nd_ni_frac"),"cm^{-3}", true).set([1.5e+10,1.5e+10])
    Efn_Efi = new item($(".Efn_Efi"),"eV").set(0)

    NdNa_ni2_frac = new item($(".NdNa_ni2_frac"), "cm^{-3}", true).set([2.25e+20,2.25e+20])
    V_o = new item($(".V_o"), "V").set(0)
    Ei = new item($(".Ei"), "eV").set(0)

    eV_val = unit_conv.eV.J

    epsilon_o = new item($(".epsilon_o"), epsilon_o_unit).set(epsilon_o)
    dielectric_constant = new item($(".dielectric_constant"), "").set(semi_prop.Si.dielectric_constant)
    epsilon_s = new item($(".epsilon_s"), epsilon_o_unit).set(epsilon_o.val*semi_prop.Si.dielectric_constant)
    twoepsilonvo_over_e_frac = new item($(".twoepsilonvo_over_e_frac"), ["","J"],true).set([2*epsilon_s.val*V_o.val, eV_val])
    NaplusNd_over_NaNd_frac = new item($(".NaplusNd_over_NaNd_frac"), "m^{-3}", true).set([Na_m3.val+Nd_m3.val, Na_m3.val*Nd_m3.val])

    W = new item($(".W"), "m").set(Math.pow(twoepsilonvo_over_e_frac.val*NaplusNd_over_NaNd_frac.val, 1/2))
    Na_over_NaplusNd = new item($(".Na_over_NaplusNd"), "m^{-3}",true).set([Na_m3.val, Na_m3.val+Nd_m3.val])
    x_n = new item($(".x_n"), "m").set(Na_over_NaplusNd.val*W.val)
    x_p  = new item($(".x_p"), "m").set(W.val-x_n.val)

    eNdxn_over_epsilons_frac = new item($(".eNdxn_over_epsilons_frac"), ["J-m^{-2}",epsilon_o_unit], true).set([-eV_val*Nd_m3.val*x_n.val,epsilon_s.val])
    electric_field = new item($(".electric_field"), "V/m").set(eNdxn_over_epsilons_frac.val)

    $cross_sectional_area_input = $(".cross_sectional_area_input")
    cross_sectional_area_input = new item($(".cross_sectional_area_input"), "m^2")
    $cross_sectional_area_unit = $(".cross_sectional_area_unit").text(ftext(cross_sectional_area_input.rep_unit))

    electric_energy = new item($(".electric_energy"), "J").set(eV_val)
    cross_sectional_area = new item($(".cross_sectional_area"), "m^2").set(1e-6)
    charge = new item($(".charge"), "C").set(-electric_energy.val*Na_m3.val*cross_sectional_area.val*x_p.val)
    async_renew()
    function refresh_fd_Na(){
        Na_ni_frac.set([$Na_input.val(),n_i.val])
        Ei_Efp.set(kT.val*Math.log(Na_ni_frac.val))
        NdNa_ni2_frac.set([$Na_input.val()*$Nd_input.val(), n_i.val*n_i.val])
        V_o.set(kT.val*Math.log(NdNa_ni2_frac.val))
        Ei.set(kT.val*Math.log(NdNa_ni2_frac.val))
        Na_m3.set($Na_input.val()*(10**6))
        twoepsilonvo_over_e_frac.set([2*epsilon_s.val*V_o.val, eV_val])
        NaplusNd_over_NaNd_frac.set([Na_m3.val+Nd_m3.val, Na_m3.val*Nd_m3.val])
        W.set(Math.pow(twoepsilonvo_over_e_frac.val*NaplusNd_over_NaNd_frac.val, 1/2))
        Na_over_NaplusNd.set([Na_m3.val, Na_m3.val+Nd_m3.val])
        x_n.set(Na_over_NaplusNd.val*W.val)
        x_p.set(W.val-x_n.val)

        eNdxn_over_epsilons_frac.set([-eV_val*Nd_m3.val*x_n.val,epsilon_s.val])
        electric_field.set(eNdxn_over_epsilons_frac.val)
        charge.set(-electric_energy.val*Na_m3.val*cross_sectional_area.val*x_p.val)
        async_renew()
    }
    function refresh_fd_Nd(){
        Nd_ni_frac.set([$Nd_input.val(),n_i.val])
        Efn_Efi.set(kT.val*Math.log(Nd_ni_frac.val))
        NdNa_ni2_frac.set([$Na_input.val()*$Nd_input.val(), n_i.val*n_i.val])
        V_o.set(kT.val*Math.log(NdNa_ni2_frac.val))
        Ei.set(kT.val*Math.log(NdNa_ni2_frac.val))
        Nd_m3.set($Nd_input.val()*(10**6))
        twoepsilonvo_over_e_frac.set([2*epsilon_s.val*V_o.val, eV_val])
        NaplusNd_over_NaNd_frac.set([Na_m3.val+Nd_m3.val, Na_m3.val*Nd_m3.val])
        W.set(Math.pow(twoepsilonvo_over_e_frac.val*NaplusNd_over_NaNd_frac.val, 1/2))
        Na_over_NaplusNd.set([Na_m3.val, Na_m3.val+Nd_m3.val])
        x_n.set(Na_over_NaplusNd.val*W.val)
        x_p.set(W.val-x_n.val)
        
        eNdxn_over_epsilons_frac.set([-eV_val*Nd_m3.val*x_n.val,epsilon_s.val])
        electric_field.set(eNdxn_over_epsilons_frac.val)
        charge.set(-electric_energy.val*Na_m3.val*cross_sectional_area.val*x_p.val)
        async_renew()
    }
    $Na_input.on("change", function(){
        refresh_fd_Na()
    })
    $Nd_input.on("change", function(){
        Nd_ni_frac.set([this.value,this.n_i])
        refresh_fd_Nd()
    })
    $cross_sectional_area_input.on("change", function(){
        charge.set(-electric_energy.val*Na_m3.val*cross_sectional_area.val*x_p.val)
        async_renew()
    })
    //#endregion

    //#region hall-fct function
    B_z = new item($(".B_z"), "T").set_renew({
        0:5e-2,
        "EH_over_vx_frac":function(){B_z.set(EH_over_vx_frac.val)}
    })
    E_H = new item($(".E_H"), "V/m").set_renew({
        0:62.5,
        "v_xB_z":function(){E_H.set(v_x.val*B_z.val)},
    })
    W = new item($(".W"), "m").set_renew({
        0:1e-4,
    })
    L = new item($(".L"), "m").set_renew({
        0:1e-3,
    })
    d = new item($(".d"), "m").set_renew({
        0:1e-5,
    })
    V_H = new item($(".V_H"), "V").set_renew({
        0:-6.25e-3,
        "IxBz_over_ned_frac":function(){V_H.set(-IxBz_over_ned_frac.val)},
        "E_HW":function(){V_H.set(-E_H.val*W.val)},
        "v_xWB_z":function(){V_H.set(-v_x.val*W.val*B_z.val)},
    })
    v_x = new item($(".v_x"), "m/s").set_renew({
        0:1250,
        "jx_over_en_frac": function(){if(jx_over_en_frac){v_x.set(jx_over_en_frac.val);}},
        "ix_over_enWd_frac":function(){if(ix_over_enWd_frac){v_x.set(ix_over_enWd_frac.val);}}})
    Volt_x = new item($(".Volt_x"), "V").set_renew({
        0:12.5,
    })
    J_x = new item($(".J_x"), "N-m").set_renew({
        0:1e+6,
        "ix_over_Wd_frac":function(){J_x.set(ix_over_Wd_frac.val)}
    })
    I_x = new item($(".I_x"), "A").set_renew({
        0:1e-3,
        "WdenmuVolt_x_over_L_frac":function(){I_x.set(WdenmuVolt_x_over_L_frac.val)}
    })
    n = new item($(".n"), "m^{-3}").set_renew({
        0:5e+21,
        "jx_over_vxe_frac":function(){n.set(jx_over_vxe_frac.val)}
    })
    mu = new item($(".mu"), "m^2/V-s").set_renew({
        0:.1,
        "IxL_over_enVxWd_frac":function(){mu.set(IxL_over_enVxWd_frac.val)}
    })

    jx_over_vxe_frac = new item($(".jx_over_vxe_frac"), [J_x.rep_unit, "J-m^{-3}"], true)
    jx_over_vxe_frac.set_renew({0: function(){jx_over_vxe_frac.set([J_x.val, Volt_x.val*eV_val])}})

    jx_over_en_frac = new item($(".jx_over_en_frac"), [J_x.rep_unit, "J-m^{-3}"], true)
    jx_over_en_frac.set_renew({0: function(){jx_over_en_frac.set([J_x.val, n.val*eV_val])}})

    ix_over_enWd_frac = new item($(".ix_over_enWd_frac"), ["A", "J-m"], true)
    ix_over_enWd_frac.set_renew({0: function(){ix_over_enWd_frac.set([I_x.val, eV_val*n.val*W.val*d.val])}})

    EH_over_vx_frac = new item($(".EH_over_vx_frac"), ["V/m", "m/s"], true)
    EH_over_vx_frac.set_renew({0: function(){EH_over_vx_frac.set([E_H.val, v_x.val])}})

    IxBz_over_ned_frac = new item($(".IxBz_over_ned_frac"), ["A-V/m","J-m^{-2}"], true)
    IxBz_over_ned_frac.set_renew({0: function(){IxBz_over_ned_frac.set([-I_x.val*B_z.val, n.val*eV_val*d.val])}})

    WdenmuVolt_x_over_L_frac = new item($(".WdenmuVolt_x_over_L_frac"), ["m^4C/s","m"], true)
    WdenmuVolt_x_over_L_frac.set_renew({0: function(){WdenmuVolt_x_over_L_frac.set([W.val*d.val*eV_val*n.val*mu.val*Volt_x.val, L.val])}})

    ix_over_Wd_frac = new item($(".ix_over_Wd_frac"), ["A","m^2"], true)
    ix_over_Wd_frac.set_renew({0: function(){ix_over_Wd_frac.set([I_x.val,W.val*d.val])}})

    ixbz_over_edVH_frac = new item($(".ixbz_over_edVH_frac"), ["A-V/m","V-m^{-2}"], true)
    ixbz_over_edVH_frac.set_renew({0: function(){ixbz_over_edVH_frac.set([I_x.val*B_z.val,eV_val*V_H.val*d.val])}})

    IxL_over_enVxWd_frac = new item($(".IxL_over_enVxWd_frac"), ["A-m","J^2/C"], true)
    IxL_over_enVxWd_frac.set_renew({0: function(){IxL_over_enVxWd_frac.set([I_x.val*L.val, eV_val*n.val*Volt_x.val*W.val*d.val])}})

    var value_set = { "W":W, "L":L, "d":d, "V_H":V_H, "n":n, "B_z":B_z, "E_H":E_H, "v_x":v_x, "J_x":J_x, "I_x":I_x, "Volt_x":Volt_x, "mu":mu,}
    var value_set_array = Object.keys(value_set)
    for (let index = 0; index < value_set_array.length; index++) {
        var cur_val = value_set_array[index]
        $(".unit_"+cur_val).text(ftext(value_set[cur_val].rep_unit))
    }

    var item_set = { "W":W, "L":L, "d":d, "V_H":V_H, "n":n, "B_z":B_z, "E_H":E_H, "v_x":v_x, "J_x":J_x, "I_x":I_x, "Volt_x":Volt_x, "mu":mu, "jx_over_vxe_frac":jx_over_vxe_frac, "jx_over_en_frac":jx_over_en_frac, "ix_over_enWd_frac":ix_over_enWd_frac, "EH_over_vx_frac":EH_over_vx_frac, "IxBz_over_ned_frac":IxBz_over_ned_frac, "WdenmuVolt_x_over_L_frac":WdenmuVolt_x_over_L_frac, "ix_over_Wd_frac":ix_over_Wd_frac, "ixbz_over_edVH_frac":ixbz_over_edVH_frac, "IxL_over_enVxWd_frac":IxL_over_enVxWd_frac}
    
    $("[id^=input_]").on("change", function(){
        input_cls_name = $(this).attr('id')
        input_v_name = input_cls_name.substr(input_cls_name.indexOf("_")+1)
        value_set[input_v_name].set($(this).val())

        $(".horizontal_button_list_disabled").each(function(){
            disabled_cls_name = $(this).attr('class').split(' ')[0]
            disabled_v_name = disabled_cls_name.substr(disabled_cls_name.indexOf("_")+1)
            
            renew_func_name = ''
            $(".pnsolve_"+disabled_v_name+":visible > span").each(function(){
                satisfied_v_name = $(this).attr('class').split(' ')[0]
                if (disabled_v_name == satisfied_v_name) {
                    console.log(renew_func_name)
                    item_set[satisfied_v_name].renew[renew_func_name]()
                }
                else if (satisfied_v_name.indexOf("_frac")>=0) {
                    item_set[satisfied_v_name].renew[0]()
                    renew_func_name += satisfied_v_name
                } else{
                    renew_func_name += satisfied_v_name
                }
            })
            
        })
        async_renew()
        // var classList = $(this).attr('class').split(/\s+/);
        // target_cls_name = $($(".horizontal_button_list_actived")).attr("class").split(' ')[0]
        // target_v_name = target_cls_name.substr(target_cls_name.indexOf("_")+1)
        // console.log(input_cls_name)
    })

    // $input_W.on("change", function(){
        
        // W.set(input_W.val())
        // V_H.set(-E_H.val*W.val)
        // ix_over_enWd_frac.set([I_x.val, eV_val*n.val*W.val*d.val])
        // v_x.set(ix_over_enWd_frac.val)
        // ix_over_Wd_frac.set([I_x.val,W.val*d.val])
        
        // jx_over_vxe_frac.set([J_x.val, Volt_x.val*eV_val])
        // jx_over_en_frac.set([J_x.val, n.val*eV_val])
        // IxBz_over_ned_frac.set([-I_x.val*B_z.val, n.val*eV_val*d.val])
        // EH_over_vx_frac.set([E_H.val, v_x.val])
        // WdenmuVolt_x_over_L_frac.set([W.val*d.val*eV_val*n.val*mu.val*Volt_x.val, L.val])
        // ixbz_over_edVH_frac.set([I_x.val*B_z.val,eV_val*V_H.val*d.val])
        // IxL_over_enVxWd_frac.set([I_x.val*L.val, eV_val*n.val*Volt_x.val*W.val*d.val])
    // })















    //#endregion
    //#region photoelectric-effect 
    $photoelectric_selector = $("#photoelectric_selector")
    var pe_values = $.map($('#photoelectric_selector option'),function(e){return e.value;});
    var cur_pe_selection = pe_values[0]
    $photoelectric_selector.on("change", function(){
        cur_pe_selection = this.value
        $.each(pe_values, function (index, element) {
            $(".got_"+ element).each(function(i){
                if ($(this).hasClass("got_"+cur_pe_selection)) {
                    $(this).show()
                } else{$(this).hide()}
            })
        })
    })

    $wl_unit_selector = $("#wl_unit_selector")
    $pe_unit_selector = $("#pe_unit_selector")
    $wn_unit_selector = $("#wn_unit_selector")

    $wave_length_input = $("#wave_length_input")
    wave_length_input = new item($("#wave_length_input"), "m").set(7.2e-8)
    wave_length = new item($(".wave_length"), "m").copy(wave_length_input)
    $frequency_input = $("#frequency_input")
    frequency_input = new item($("#frequency_input"), "s^{-1}").set(c/wave_length_input.val)
    frequency = new item($(".frequency"), "s^{-1}").copy(frequency_input)

    $photon_energy_input = $("#photon_energy_input")
    photon_energy_input = new item($("#photon_energy_input"), "J").set(h*frequency_input.val)
    p_energy = new item($(".p_energy"), "J").copy(photon_energy_input)

    $wave_number_input = $("#wave_number_input")
    wave_number_input = new item($("#wave_number_input"), "m^{-1}").set((2*Math.PI)/wave_length_input.val)
    wave_number = new item($(".wave_number"), "m^{-1}").copy(wave_number_input)

    $wl_unit = $(".wl_unit").text(ftext(wave_length_input.rep_unit))
    $pe_unit = $(".pe_unit").text(ftext(photon_energy_input.rep_unit))
    $wn_unit = $(".wn_unit").text(ftext(wave_number_input.rep_unit))
    async_renew()

    $wl_unit_selector.on("change", function(){
        wave_length_input.change_unit(this.value)
        wave_length.change_unit(this.value)
        $wl_unit.text(ftext(this.value))
        async_renew()
    })
    $pe_unit_selector.on("change", function(){
        photon_energy_input.change_unit(this.value)
        p_energy.change_unit(this.value)
        $pe_unit.text(ftext(this.value))
        async_renew()
    })
    $wn_unit_selector.on("change", function(){
        wave_length_input.change_unit(this.value)
        wave_number.change_unit(this.value)
        $wn_unit.text(ftext(this.value))
        async_renew()
    })

    $wave_length_input.on("change", function(){
        wave_length.copy(wave_length_input.set(this.value, 0, true))
        frequency.copy(frequency_input.set(c/wave_length.val))
        p_energy.copy(photon_energy_input.set(h*frequency.val))
        wave_number.copy(wave_number_input.set((2*Math.PI)/wave_length.val))
        async_renew()
    })
    $frequency_input.on("change", function(){
        frequency.copy(frequency_input.set(this.value, 0, true))
        wave_length.copy(wave_length_input.set(c/frequency.val))
        p_energy.copy(photon_energy_input.set(h*frequency.val))
        wave_number.copy(wave_number_input.set((2*Math.PI)/wave_length.val))
        async_renew()
    })
    $photon_energy_input.on("change", function(){
        p_energy.copy(photon_energy_input.set(this.value, 0, true))
        frequency.copy(frequency_input.set(p_energy.val/h))
        wave_length.copy(wave_length_input.set(c/frequency.val))
        wave_number.copy(wave_number_input.set((2*Math.PI)/wave_length.val))
    })
    $wave_number_input.on("change", function(){
        wave_number.set(wave_number_input.set(this.value, 0, true))
        wave_length.copy(wave_number_input.set((2*Math.PI)/wave_number.val))
        wave_length.copy(wave_length_input.set(c/frequency.val))
        p_energy.copy(photon_energy_input.set(h*frequency.val))
    })
    //#endregion

    lattice_constant_input = new item($("#lattice_constant_input"), "Å").set(semi_prop.Si.lattice_constant)
    lattice_constant_in_m_input = new item($("#lattice_constant_in_m_input"), "m").set(semi_prop.Si.lattice_constant*unit_conv.Å.m)
    atomic_weight_input = new item($("#atomic_weight_input"), "u").set(semi_prop.Si.weight)
    atomic_weight_in_kg_input = new item($("#atomic_weight_in_kg_input"), "kg").set(semi_prop.Si.weight*unit_conv.u.kg)

    lattice_constant = new item($(".lattice_constant"), "Å").copy(lattice_constant_input)
    lattice_constant_in_m = new item($(".lattice_constant_in_m"), "m").copy(lattice_constant_in_m_input)
    atomic_weight = new item($(".atomic_weight"), "u").copy(atomic_weight_input)
    atomic_weight_in_kg = new item($(".atomic_weight_in_kg"), "kg").copy(atomic_weight_in_kg_input)
    
    N_over_V = new item($(".N_over_V"), ["","m^3"], true)
    N_over_V.set_renew({
        0: function(){N_over_V.set([8,lattice_constant_in_m.val**3])}
    })
    M_over_V = new item($(".M_over_V"), ["kg","m^3"], true)
    M_over_V.set_renew({
        0: function(){M_over_V.set([atomic_weight_in_kg.val*8,lattice_constant_in_m.val**3])}
    })
    volumn_density = new item($(".volumn_density"), "m^{-3}").set(N_over_V.val)
    mass_density = new item($(".mass_density"), "kg/m^3").set(M_over_V.val)

    //#region Crystal structure
    $("#semi_crystal_selector").on("change", function(){
        var cur_semi = $(this).val()
        if (cur_semi !="other") {
            $(".notchoose_other").show()
            $(".choose_other").hide()
            $(".lattice_constant").text(ftext())
            lattice_constant.set(semi_prop[cur_semi].lattice_constant)
            lattice_constant_in_m.set(semi_prop[cur_semi].lattice_constant/unit_conv.m.Å)
            N_over_V.renew[0]()
            M_over_V.renew[0]()
            volumn_density.set(N_over_V.val)
            mass_density.set(M_over_V.val)
            async_renew()
        } else{
            $(".choose_other").show()
            $(".notchoose_other").hide()
        }
    })

    $("#lattice_constant_input").on("change", function(){
        lattice_constant_input.set($(this).val())
        lattice_constant_in_m_input.set($(this).val()*unit_conv.Å.m)
        lattice_constant.set($(this).val())
        lattice_constant_in_m.set($(this).val()*unit_conv.Å.m)
        N_over_V.renew[0]()
        M_over_V.renew[0]()
        async_renew()
    })
    $("#lattice_constant_in_m_input").on("change", function(){
        lattice_constant_in_m_input.set($(this).val())
        lattice_constant_input.set($(this).val()*unit_conv.m.Å)
        lattice_constant_in_m.set($(this).val())
        lattice_constant.set($(this).val()*unit_conv.m.Å)
        N_over_V.renew[0]()
        M_over_V.renew[0]()
        async_renew()
    })
    $("#atomic_weight_input").on("change", function(){
        atomic_weight_input.set($(this).val())
        atomic_weight_in_kg_input.set($(this).val()*unit_conv.u.kg)
        atomic_weight.set($(this).val())
        atomic_weight_in_kg.set($(this).val()*unit_conv.u.kg)
        N_over_V.renew[0]()
        M_over_V.renew[0]()
        async_renew()
    })
    $("#atomic_weight_in_kg_input").on("change", function(){
        atomic_weight_in_kg_input.set($(this).val())
        atomic_weight_input.set($(this).val()*unit_conv.kg.u)
        atomic_weight_in_kg.set($(this).val())
        atomic_weight.set($(this).val()*unit_conv.kg.u)
        N_over_V.renew[0]()
        M_over_V.renew[0]()
        async_renew()
    })
    //#endregion
})

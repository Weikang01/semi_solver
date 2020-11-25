//#region tools
function abs_log(n){
    return Math.log10(Math.abs(n))
}

function expo_text(num,unit="", get_raw=false){
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

    var k, h, c
    
    k = constants.k.eV.value
    h = constants.h.J.value
    c = constants.c.m.value
    //#endregion
    //#region formulas
    n_i_formula = new formula_ctr($("#n_i_short"),$("#n_i_long"))
    n_i_formula.show(0)
    //#endregion

    //#region test
    var $n1 = $("#n1")
    var $n2 = $("#n2")
    var $out = $("#out")
    
    $n1.on("input", function(){
        if ($n2.val()!="") {
            res = parseFloat($n2.val())*parseFloat($n1.val())
            $out.text(ftext(expo_text(res)))
            async_renew()
        }
    })
    $n2.on("input", function(){
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

    N_ic = new item($(".N_ic"), "cm^{-3}")
    N_iv = new item($(".N_iv"), "cm^{-3}")
    N_c = new item($(".N_c"), "cm^{-3}")
    N_v = new item($(".N_v"), "cm^{-3}")
    Temp = new item($(".T_text"), "K")
    kT = new item($(".kT"), "eV")
    E_g = new item($(".E_g"), "eV")
    alpha = new item($(".alpha_frac"), "")
    alpha_3o2 = 1
    negEg_2kT = new item($(".negEg_2kT"), "")
    n_i = new item($(".n_i"), "cm^{-3}")
    //#endregion

    // #region p2 vars
    E_c_E_F_input = new item($("#E_c_E_F_input"), "eV")
    $E_c_E_F_input = $("#E_c_E_F_input")
    E_c_E_F_out = new item($(".E_c_E_F_out"), "eV")
    E_c_E_F = new item($(".E_c_E_F"), "eV")

    E_F_E_v_input = new item($("#E_F_E_v_input", "eV"))
    $E_F_E_v_input = $("#E_F_E_v_input")
    E_F_E_v_out = new item($(".E_F_E_v_out"), "eV")
    E_F_E_v = new item($(".E_F_E_v"), "eV")

    n_o_input = new item($("#n_o_input"), "cm^{-3}")
    $n_o_input = $("#n_o_input")
    n_o_out = new item($(".n_o_out"), "cm^{-3}")

    p_o_input = new item($("#p_o_input"), "cm^{-3}")
    $p_o_input = $("#p_o_input")
    p_o_out = new item($(".p_o_out"), "cm^{-3}")
///////////////////////////////////////////////////////////////////////////
    aNcDno_frac = new item($(".aNcDno_frac"), "cm^{-3}", true)
    EcEfkt_frac = new item($(".EcEfkt_frac"), "eV", true)

    aNvDpo_frac = new item($(".aNvDpo_frac"), "cm^{-3}", true)
    EfEvkt_frac = new item($(".EfEvkt_frac"), "eV", true)
///////////////////////////////////////////////////////////////////////////
    E_F_E_v_out = new item($(".E_F_E_v_out"), "eV")
    ni2ono_frac = new item($(".ni2ono_frac"), "cm^{-3}", true)
    p_o_out = new item($(".p_o_out"), "cm^{-3}")

    E_c_E_F_out = new item($(".E_c_E_F_out"), "eV")
    ni2opo_frac = new item($(".ni2opo_frac"), "cm^{-3}", true)
    n_o_out = new item($(".n_o_out"), "cm^{-3}")
    //#endregion
//////////////////////////////////////////////////////////////////// f_FD //
    EcminusEf = 0
    E_Ef_val = 0

    f_FD_frac = new item($(".f_FD_frac"), "", true)
    f_FD = new item($(".f_FD"), "")
    one_minus_f_FD = new item($(".one_minus_f_FD", ""))

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
///////////////////////////////////////////////////////////////////////////
    function initiate(){
    N_ic.set(semi_prop.Si.N_ic)
    N_c.set(semi_prop.Si.N_ic)
    N_iv.set(semi_prop.Si.N_iv)
    N_v.set(semi_prop.Si.N_iv)
    E_g.set(semi_prop.Si.E_g)
    Temp.set(300)
    kT.set(k*300)
    alpha.set(1)
    negEg_2kT.set(-E_g.val/(2*kT.val), 1)
    n_i.set(semi_prop.Si.n_i)
    //#endregion
    
    //#region p2
    EcEfkt_frac.set([-.552, kT.val], 1)
    n_o_out.set(N_c.val*Math.exp(EcEfkt_frac.val))
    ni2ono_frac.set([n_i.val*n_i.val, n_o_out.val])
    p_o_out.set(ni2ono_frac.val)
    aNcDno_frac.set([semi_prop.Si.N_ic, 1.5e+10])
    
    EfEvkt_frac.set([-.552, kT.val], 1)
    ni2opo_frac.set([n_i.val*n_i.val, p_o_out.val])
    aNcDno_frac.set([semi_prop.Si.N_ic, 1.5e+10])
    ///////////////////////////////////////////////////////////////////////////
    E_c_E_F_input.set(.552)
    n_o_input.set(1.5e+10)
    E_c_E_F.set(.552)
    E_F_E_v_out.set(E_g.val-E_c_E_F.val)
    
    E_F_E_v_input.set(.552)
    p_o_input.set(1.5e+10)
    E_F_E_v.set(.552)
    E_c_E_F_out.set(E_g.val-E_F_E_v.val)
    ///////////////////////////////////////////////////////////////////////////
    EcminusEf = E_c_E_F.val
    E_Ef_val = EcminusEf-0.5
    f_FD_frac.set([1,Math.exp(E_Ef_val/kT.val)+1])
    f_FD.set(f_FD_frac.val)
    one_minus_f_FD.set(1-f_FD.val)
    ///////////////////////////////////////////////////////////////////////////
    //#endregion
    async_renew()
    }
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
    initiate()
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
        async_renew()
    })
    $T.on("input", function(){
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
    $n_o_input.on("input", function(){
        if (n_o_input.val<=0) {n_o_input.set(1.5e+10)}
        n_o_input.set(parseFloat(this.value))
        refresh_solve_E_c_E_F()
        async_renew()
    })
    $E_c_E_F_input.on("input", function(){
        E_c_E_F_input.set(parseFloat(this.value))
        refresh_solve_n_o()
        async_renew()
    })
    $p_o_input.on("input", function(){
        if (p_o_input.val<=0) {p_o_input.set(1.5e+10)}
        p_o_input.set(parseFloat(this.value))
        refresh_solve_E_F_E_v()
        async_renew()
    })
    $E_F_E_v_input.on("input", function(){
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
    $E_c_E_input.on("input", function(){
        E_c_E_input_val = parseFloat(this.value)
        refresh_data_el()
        async_renew()
    })
    $E_E_v_input.on("input", function(){
        E_E_v_input_val = parseFloat(this.value)
        refresh_data_el()
        async_renew()
    })
    $external_E_input.on("input", function(){
        external_E_input_val = parseFloat(this.value)
        refresh_data_el()
        async_renew()
    })
    $external_fermi_input.on("input", function(){
        external_fermi_input_val = parseFloat(this.value)
        refresh_data_el()
        async_renew()
    })
    //#endregion

    //#region photoelectric effect 
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

    $wl_unit = $(".wl_unit")
    $pe_unit = $(".pe_unit")
    $wn_unit = $(".wn_unit")
    
    $wl_unit_selector = $("#wl_unit_selector")
    $pe_unit_selector = $("#pe_unit_selector")
    $wn_unit_selector = $("#wn_unit_selector")

    $wave_length_input = $("#wave_length_input")
    wave_length_input = new item($("#wave_length_input"), "m")
    wave_length = new item($(".wave_length"), "m")

    $frequency_input = $("#frequency_input")
    frequency_input = new item($("#frequency_input"), "s^{-1}")
    frequency = new item($(".frequency"), "s^{-1}")

    $photon_energy_input = $("#photon_energy_input")
    photon_energy_input = new item($("#photon_energy_input"), "J")
    p_energy = new item($(".p_energy"), "J")

    $wave_number_input = $("#wave_number_input")
    wave_number_input = new item($("#wave_number_input"), "m^{-1}")
    wave_number = new item($(".wave_number"), "m^{-1}")

    function div2_initialize(){
        $wl_unit.text(ftext(wave_length.rep_unit))
        $pe_unit.text(ftext(p_energy.rep_unit))
        $wn_unit.text(ftext(wave_number.rep_unit))

        wave_length.copy(wave_length_input.set(7.2e-8))
        frequency.copy(frequency_input.set(c/wave_length.val))
        p_energy.copy(photon_energy_input.set(h*frequency.val))
        wave_number.copy(wave_number_input.set((2*Math.PI)/wave_length.val))

        async_renew()
    }
    div2_initialize()
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

    $wave_length_input.on("input", function(){

        wave_length.copy(wave_length_input.set(this.value, 0, true))
        frequency.copy(frequency_input.set(c/wave_length.val))
        p_energy.copy(photon_energy_input.set(h*frequency.val))
        wave_number.copy(wave_number_input.set((2*Math.PI)/wave_length.val))
        async_renew()
    })
    $frequency_input.on("input", function(){
        frequency.copy(frequency_input.set(this.value, 0, true))
        wave_length.copy(wave_length_input.set(c/frequency.val))
        p_energy.copy(photon_energy_input.set(h*frequency.val))
        wave_number.copy(wave_number_input.set((2*Math.PI)/wave_length.val))
        async_renew()
    })
    $photon_energy_input.on("input", function(){
        p_energy.copy(photon_energy_input.set(this.value, 0, true))
        frequency.copy(frequency_input.set(p_energy.val/h))
        wave_length.copy(wave_length_input.set(c/frequency.val))
        wave_number.copy(wave_number_input.set((2*Math.PI)/wave_length.val))
    })
    $wave_number_input.on("input", function(){
        wave_number.set(wave_number_input.set(this.value, 0, true))
        wave_length.copy(wave_number_input.set((2*Math.PI)/wave_number.val))
        wave_length.copy(wave_length_input.set(c/frequency.val))
        p_energy.copy(photon_energy_input.set(h*frequency.val))
    })
    //endregion
})

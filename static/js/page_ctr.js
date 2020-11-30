var debug = false

$(function(){
    $(".d1").hide()
    $(".d2").hide()
    $(".d3").hide()
    $(".d4").hide()
    $(".d0").show()
    $("#navi_bar li").on("click", function(){
        cur_id = $(this).attr("id")
        $("#navi_bar li").each(function(){
            my_id = $(this).attr("id")
            if (my_id == cur_id) {$("."+my_id).show()} else{$("."+my_id).hide()}
        })
    })

    $("#E_E_v_s").hide()
    $("#E_s").hide()
    $("#E_c_E_s").show()

    $("[id^=inputpara_]").hide()
    $("[class^=got_]").hide()

    $("[class^=solve_]").hide()
    $(".solve_n_o").show()
    $(".got_wave_length").show()

    $(".semi_lattice_in_m").hide()
    $(".semi_weight_in_kg").hide()
    $(".choose_other").hide()

    solve_value_set = new Set()
    $("[class^=pnsolve_]").each(function(){
        cls_name = $(this).attr("class").split(' ')[0]
        v_name = cls_name.substr(cls_name.indexOf("_")+1)
        if(solve_value_set.has(v_name)){
            $(this).hide()
        } else{
            solve_value_set.add(v_name)
        }
    })

    if (debug == true) {
        $("[class^=pnsolve_]").show()
    }

    var tar_set = new Set()
    function remove_all_relative_values(value_name){
        solve_value_set.delete(value_name)
        $(".need_"+value_name).each(function(){
            target_cls_name = $(this).attr("class").split(' ')[0]
            target_v_name = target_cls_name.substr(target_cls_name.indexOf("_")+1)
            $(this).removeClass("need_"+value_name)
            $(this).addClass("got_"+value_name)
            // var classList = $(this).attr('class').split(/\s+/);
            // console.log("click off: ", classList, ".got_"+value_name, tar_set)
            if (!$(this).is('[class*="need_"]') && !$("#inputpara_" + target_v_name).is(":visible") && !tar_set.has(target_v_name)){
                tar_set.add(target_v_name)
                $(".checkbox_"+target_v_name).addClass("horizontal_button_list_disabled")
                $(".pnsolve_"+target_v_name).hide()
                $(this).show()
                remove_all_relative_values(target_v_name)
            }
        })
    }
    eqns_with_needs_set = new Set()
    function restore_all_relative_values(value_name){
        $(".got_"+value_name).each(function(){
            target_cls_name = $(this).attr("class").split(' ')[0]
            target_v_name = target_cls_name.substr(target_cls_name.indexOf("_")+1)
            $(this).removeClass("got_"+value_name)
            $(this).addClass("need_"+value_name)
            // var classList = $(this).attr('class').split(/\s+/);
            // console.log("click on: ", classList, ".need_"+value_name, rem_value_set)

            if (!$(".checkbox_"+target_v_name).hasClass("horizontal_button_list_actived")) {
                var one_of_them_has_no_need = false
                
                $("pnsolve_"+target_v_name).each(function(){
                    if (!$(this).is('[class*="need_"]')){
                        one_of_them_has_no_need = true
                        return false
                    }
                })
                if (!one_of_them_has_no_need) {
                    $(".checkbox_"+target_v_name).removeClass("horizontal_button_list_disabled")
                    tar_set.delete(target_v_name)
                    $(".pnsolve_"+target_v_name).hide()
                    $($(".pnsolve_"+target_v_name)[0]).show()
                    restore_all_relative_values(target_v_name)
                }
            }
        })
    }

    $checkbox_list = $("[class^=checkbox_]").on("click", function(){
        cls_name = $(this).attr("class").split(' ')[0]
        v_name = cls_name.substr(cls_name.indexOf("_")+1)
        solve_value_set.delete(v_name)
        if($(this).hasClass("horizontal_button_list_disabled")){
            return
        }
        if ($(this).hasClass("horizontal_button_list_actived")) {
            $(this).removeClass("horizontal_button_list_actived")
            $("#inputpara_"+v_name).hide()
            $($(".pnsolve_"+v_name)[0]).show()
            restore_all_relative_values(v_name)
        } else {
            $(this).addClass("horizontal_button_list_actived")
            $(".pnsolve_"+v_name).hide()
            $("#inputpara_"+v_name).show()
            remove_all_relative_values(v_name)
        }
    })

    
    $("#semi_lattice_unit_selector").on("change", function(){
        $("[class^=semi_lattice_in_]").hide()
        $(".semi_lattice_in_"+$(this).val()).show()
    })
    $("#semi_weight_unit_selector").on("change", function(){
        $("[class^=semi_weight_in_]").hide()
        $(".semi_weight_in_"+$(this).val()).show()
    })
})
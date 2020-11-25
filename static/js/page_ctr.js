$(function(){
    $(".d1").hide()
    $(".d2").hide()
    $(".d0").show()
    $("#navi_bar li").on("click", function(){
        cur_id = $(this).attr("id")
        $("#navi_bar li").each(function(){
            my_id = $(this).attr("id")
            if (my_id == cur_id) {$("."+my_id).show()} else{$("."+my_id).hide()}
        })
    })

    $E_E_v_s = $("#E_E_v_s").hide()
    $E_s = $("#E_s").hide()
    $E_c_E_s = $("#E_c_E_s").show()

    $solve_p_o = $(".solve_p_o").hide()
    $solve_E_F_E_v = $(".solve_E_F_E_v").hide()
    $solve_E_c_E_F = $(".solve_E_c_E_F").hide()
    $solve_n_o = $(".solve_n_o").show()

    $got_frequency = $(".got_frequency").hide()
    $got_photon_energy = $(".got_photon_energy").hide()
    $got_wave_number = $(".got_wave_number").hide()
    $got_wave_length = $(".got_wave_length").show()
})
import json


def combine_json():
    data_files = [
        "/workspaces/UAV-Digital-Twin/test/stream/sim_init_sensor_data/fs_l100_cpu2.json",
        "/workspaces/UAV-Digital-Twin/test/stream/sim_init_sensor_data/fs_l100_cpu8.json",
    ]

    # combine the json files
    output = []
    for file in data_files:
        with open(file, "r") as f:
            data = json.load(f)
            output.extend(data)

    return output



def gen_data(data):
    # read file as data
    # with open(data_file, "r") as f:
    #     data = json.load(f)
        
    output = {"0": {}, "20": {}, "40": {}, "60": {}, "80": {}}


    for item in data:
        traffic_intensity = item["TrafficIntensity"]
        parallelism = item["Parallelism"]
        # redefine the parallelism to "2g" if parallelism is 1 and "3g" if parallelism is 2
        if parallelism == 2:
            parallelism = "2g"
        elif parallelism == 8:
            parallelism = "3g"
        else:
            print(f"Parallelism is beyond the range: {parallelism}")
            continue

        service_rate = item["ServiceRate"]

        # Determine the group based on traffic intensity from 80 to 120 and 5 groups
        group = None
        if 0 <= traffic_intensity < 0.2:
            group = "0"
        elif 0.2 <= traffic_intensity < 0.4:
            group = "20"
        elif 0.4 <= traffic_intensity < 0.6:
            group = "40"
        elif 0.6 <= traffic_intensity < 0.8:
            group = "60"
        elif 0.8 <= traffic_intensity <= 1:
            group = "80"
        else:
            print(f"Traffic intensity is beyond the range: {traffic_intensity}")
            continue


        # append the service rate to the group
        output[group][parallelism] = output.get(group, {}).get(parallelism, {"mean": []})
        output[group][parallelism]["mean"].append(service_rate)


    # slice the first 100 data
    num_data = 24
    for key in output:
        for p_key in output[key]:
            # if len is less than 100, send error
            if len(output[key][p_key]["mean"]) < num_data:
                print(f"Group {key} Parallelism {p_key} has less than 100 data, data: {len(output[key][p_key]['mean'])}")
                raise ValueError("Data is less than 100")
            else:
                output[key][p_key]["mean"] = output[key][p_key]["mean"][:num_data]

                

    # write to file
    with open("dt_input_config.json", "w") as f:
        json.dump(output, f, indent=4)




def get_freq(data_file):
    # read file as data
    with open(data_file, "r") as f:
        data = json.load(f)

    traffic_intensity = [item["TrafficIntensity"] for item in data]

    # Determine the group by traffic intensity from 0 to 1 and 5 groups
    group = {}
    for i in range(0, 100, 20):
        group[str(i)] = 0

    for item in traffic_intensity:
        if 0 <= item < 0.2:
            group["0"] += 1
        elif 0.2 <= item < 0.4:
            group["20"] += 1
        elif 0.4 <= item < 0.6:
            group["40"] += 1
        elif 0.6 <= item < 0.8:
            group["60"] += 1
        elif 0.8 <= item <= 1:
            group["80"] += 1
        else:
            print(f"Traffic intensity is beyond the range: {item}")
            continue

    print(group)




if __name__ == "__main__":
    gen_data(combine_json())
    # get_freq(data_file="/workspaces/UAV-Digital-Twin/test/stream/sim_init_sensor_data/fs_l100_cpu3.json")
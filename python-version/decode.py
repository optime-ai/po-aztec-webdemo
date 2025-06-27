import os
import argparse
import urllib.request
import sys
from dbr import *
import json
import hashlib
import time
import subprocess
import pathlib
from google.cloud import secretmanager
import os

PWD = str(pathlib.Path(__file__).parent.absolute()) + '/'
USE_HTTPS = True if 'SPRING_AZTEC_IMAGE_URL_HTTPS' in os.environ and os.environ['SPRING_AZTEC_IMAGE_URL_HTTPS'] == 'true' else False
DBR_SETTINGS_FILE = PWD + 'dbr_settings.json'
CONVERTING_SETTINGS_FILE = PWD + 'converting_settings.json'
RESULTS_FILENAME = 'result.json'


def get_secret(secret_name, project_id=os.environ.get('SPRING_GCP_COMMON_PROJECT_ID')):
    client = secretmanager.SecretManagerServiceClient()
    secret_name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
    try:
        response = client.access_secret_version(request={"name": secret_name})
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        raise Exception(f"Unable to fetch secret {secret_name}: {str(e)}")


def get_reader():
    reader = BarcodeReader()
    reader.init_license(os.environ['DBR_LICENSE'] if 'DBR_LICENSE' in os.environ else get_secret('po-dbr-license'))
    error = reader.init_runtime_settings_with_file(DBR_SETTINGS_FILE)
    if error[0] != EnumErrorCode.DBR_OK:
        print(error[1])
        sys.exit()
    return reader


def convert(converter_settings, original_image_path, converted_image_path):
    args = ['convert']
    args += converter_settings
    args.append(original_image_path)
    args.append(converted_image_path)
    subprocess.run(args)


def download_image(url, destination_path):
    urllib.request.urlretrieve(url, destination_path)


def format_dir_path(dirpath):
    return dirpath + ('/' if not dirpath.endswith('/') else '')


def create_original_image_path(workdir):
    return format_dir_path(workdir) + 'original_image.jpeg'


def create_output_json_path(workdir):
    return format_dir_path(workdir) + RESULTS_FILENAME


def create_converted_image_path(workdir):
    return format_dir_path(workdir) + hashlib.md5(str(time.time()).encode('utf-8')).hexdigest() + '_converted_image.jpeg'


def check_workdir(workdir):
    if not os.path.exists(workdir):
        os.makedirs(workdir)

def read_image(reader, image_path):
    try:
        results = reader.decode_file(image_path)
        return results
    except BarcodeReaderError as ex:
        return None


def get_converters():
    with open(CONVERTING_SETTINGS_FILE) as f:
        return json.load(f)


def decode_aztec_data(aztec_data):
    cmd = 'echo "{}" | base64 --decode | drpdecompress | iconv -f UCS-2LE -t UTF-8//TRANSLIT'
    cmd = ["/bin/sh", "-c", cmd.format(aztec_data)]
    instance = subprocess.Popen(cmd,
                                stdin=subprocess.PIPE,
                                stdout=subprocess.PIPE,
                                stderr=subprocess.DEVNULL,
                                universal_newlines=True)
    return instance.stdout.read()


def format_dbr_result(result):
    if ' ' in result:
        result = result.split(' ')[1]
    return result


def parse(decoded_string):
    parts = decoded_string.split('|')
    if len(parts) < 66:
        raise ValueError('Decoded string has invalid elements number, string: ' + decoded_string)
    return parts

def map(parsed_data):
    fields = {
        7: "registrationNumber",
        8 : "brand",
        9 : "type",
        10 : "variant",
        11 : "version",
        12 : "model",
        13 : "vin",
        14 : "certificateReleaseDate",
        15 : "validity",
        16 : "holderFullName",
        17 : "holderFirstName",
        18 : "holderLastName",
        19 : "holderName",
        20 : "holderPesel",
        21 : "holderZipCode",
        22 : "holderCity",
        24 : "holderStreetName",
        25 : "holderHouseNumber",
        26 : "holderApartmentNumber",
        27 : "ownerFullName",
        28 : "ownerFirstName",
        29 : "ownerLastName",
        30 : "ownerName",
        31 : "ownerPesel",
        32 : "ownerZipCode",
        33 : "ownerCity",
        35 : "ownerStreetName",
        36 : "ownerHouseNumber",
        37 : "ownerApartmentNumber",
        38 : "vehicleMaxTotalWeight",
        39 : "vehicleAllowedTotalWeight",
        40 : "vehicleCombinationAllowedTotalWeight",
        41 : "vehicleWeight",
        42 : "vehicleCategory",
        43 : "approvalCertificateNumber",
        44 : "axlesNumber",
        45 : "trailerMaxWeightWithBrakes",
        46 : "trailerMaxWeightWithoutBrakes",
        47 : "powerToWeightRatio",
        48 : "engineCapacity",
        49 : "enginePower",
        50 : "fuelType",
        51 : "firstRegistrationDate",
        52 : "numberOfSeats",
        53 : "numberOfStandingPlaces",
        54 : "vehicleType",
        55 : "purpose",
        56 : "productionYear",
        57 : "allowedPackageWeight",
        58 : "maxAllowedAxlePressure",
        59 : "vehicleCardNumber"
    }
    mapped_obj = {}
    for key,value in fields.items():
        mapped_obj[value] = parsed_data[key]
    return mapped_obj


####################################################################################################

parser = argparse.ArgumentParser()
parser.add_argument('workdir', type=str)
parser.add_argument('url', type=str)
args = parser.parse_args()
args.url = args.url if USE_HTTPS is True else str(args.url).replace('https:', 'http:')

success = True
error = 'no error'
original_img_path = None
converted_image_path = None
converter = None
mapped_data = None
decoded_string = None
try:
    check_workdir(args.workdir)
    start_time = time.time()
    reader = get_reader()
    original_img_path = create_original_image_path(args.workdir)
    download_image(args.url, original_img_path)
    original_img_result = read_image(reader, original_img_path)
    if original_img_result != None and len(original_img_result) == 1:
        read_string = original_img_result[0].barcode_text
    else:
        converters = get_converters()
        for converter in converters:
            converted_image_path = create_converted_image_path(args.workdir)
            convert(converter, original_img_path, converted_image_path)
            converted_img_result = read_image(reader, converted_image_path)
            if converted_img_result != None and len(converted_img_result) == 1:
                read_string = converted_img_result[0].barcode_text
                break
        if read_string == None:
            raise Exception('No result')

    read_string = format_dbr_result(read_string)
    decoded_string = decode_aztec_data(read_string)
    parsed_data = parse(decoded_string)
    mapped_data = map(parsed_data)

except Exception as ex:
    error = ex
    success = False

output = {
    'success': success,
    'originalImagePath': original_img_path,
    'decodedImagePath': None if not success else (original_img_path if converted_image_path is None else converted_image_path),
    'converter': None if not success else str(converter),
    'data': mapped_data,
    'decodedString': str(decoded_string),
    'message': str(error),
    'duration': str(round(time.time() - start_time, 2))
}

with open(create_output_json_path(args.workdir), 'w', encoding='utf8') as fp:
    json.dump(output, fp, ensure_ascii=False)
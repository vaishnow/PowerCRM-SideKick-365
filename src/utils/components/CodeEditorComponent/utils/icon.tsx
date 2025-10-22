import type { ReactNode } from 'react';
import { SiHtml5 } from "@react-icons/all-files/si/SiHtml5";
import { SiCss3 } from "@react-icons/all-files/si/SiCss3";
import { SiJavascript } from "@react-icons/all-files/si/SiJavascript";
import { SiTypescript } from "@react-icons/all-files/si/SiTypescript";
import { SiJson } from "@react-icons/all-files/si/SiJson";
import { FcPicture } from "@react-icons/all-files/fc/FcPicture";
import { FaChevronRight } from "@react-icons/all-files/fa/FaChevronRight";
import { FaChevronDown } from "@react-icons/all-files/fa/FaChevronDown";
import { AiFillFileText } from "@react-icons/all-files/ai/AiFillFileText";

function getIconHelper() {
    const cache = new Map<string, ReactNode>();
    cache.set("js", <SiJavascript color="#fbcb38" />);
    cache.set("jsx", <SiJavascript color="#fbcb38" />);
    cache.set("ts", <SiTypescript color="#378baa" />);
    cache.set("tsx", <SiTypescript color="#378baa" />);
    cache.set("css", <SiCss3 color="purple" />);
    cache.set("json", <SiJson color="#5656e6" />);
    cache.set("html", <SiHtml5 color="#e04e2c" />);
    cache.set("png", <FcPicture />);
    cache.set("jpg", <FcPicture />);
    cache.set("ico", <FcPicture />);
    cache.set("txt", <AiFillFileText color="white" />);
    cache.set("closedDirectory", <FaChevronRight />);
    cache.set("openDirectory", <FaChevronDown />);
    return function (extension: string, name: string): ReactNode {
        if (cache.has(extension))
            return cache.get(extension);
        else if (cache.has(name))
            return cache.get(name);
        else
            // return <FcFile />;
        return null;
    }
}

export const getIcon = getIconHelper();
